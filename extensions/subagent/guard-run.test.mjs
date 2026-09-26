import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, quoteArgument, discoveryScript } from './guard-run.mjs';

const runner = fileURLToPath(new URL('./guard-run.mjs', import.meta.url));
const windows = process.platform === 'win32';
function run(source, options = [], args = []) {
  // Small bounded test output only; production runner inherits streams.
  return spawnSync(process.execPath, [runner, '--timeout-seconds', '8', '--memory-mb', '256', ...options, '--', process.execPath, '-e', source, ...args], { encoding: 'utf8', timeout: 25000, maxBuffer: 16 * 1024 });
}
function expect(result, code) {
  assert.equal(result.error, undefined);
  assert.equal(result.status, code, `${result.stdout}\n${result.stderr}`);
}
test('CLI defaults, validation and Windows quoting', () => {
  assert.deepEqual(parseArgs(['--', 'node', 'a']), { timeoutSeconds: 120, memoryMB: 2048, command: 'node', args: ['a'] });
  for (const value of ['0', '-1', 'NaN', 'Infinity']) assert.throws(() => parseArgs(['--memory-mb', value, '--', 'node']));
  assert.throws(() => parseArgs(['node']));
  assert.equal(quoteArgument('a b\\'), '"a b\\\\"');
  assert.equal(quoteArgument('a"b'), '"a\\"b"');
});
test('mock discovery rejects recycled snapshot PIDs and accepts new descendants at stale owned PIDs', { skip: !windows }, () => {
  const directory = mkdtempSync(join(tmpdir(), 'guard-discovery-test-'));
  try {
    const script = join(directory, 'test.ps1');
    writeFileSync(script, String.raw`
$ErrorActionPreference = 'Stop'
${discoveryScript}
function Identity($p) { return $p.stamp.ToString() }
function Open-Process($id) {
  if (!$processes.ContainsKey([int]$id)) { throw [ArgumentException]::new('exited') }
  return $processes[[int]$id]
}
function Live($entry) {
  $p = $processes[[int]$entry.id]
  if ($null -ne $p -and $p.stamp -eq $entry.stamp -and !$p.HasExited) { return $p }
  return $null
}
function Process($stamp) {
  $p = [pscustomobject]@{ stamp = [long]$stamp; HasExited = $false }
  $p | Add-Member ScriptMethod Dispose { }
  return $p
}
function Row($id, $parent, $stamp) {
  return [pscustomobject]@{ ProcessId = $id; ParentProcessId = $parent; CreationDate = [datetime]::new([long]$stamp, [DateTimeKind]::Utc) }
}
function Require($condition, $message) { if (!$condition) { throw $message } }
# Snapshot child 2 exited; the opened PID 2 now belongs to someone else.
$owned = @{ 1 = @{ id = 1; stamp = '1000' } }
$processes = @{ 1 = (Process 1000); 2 = (Process 3000) }
Discover-Owned @((Row 1 0 1000), (Row 2 1 2000))
Require (!$owned.ContainsKey(2)) 'Accepted a recycled child PID'
# A stale owned PID is now a real new child, with a grandchild listed first.
$owned[2] = @{ id = 2; stamp = '2000' }
$processes[3] = Process 4000
Discover-Owned @((Row 3 2 4000), (Row 2 1 3000), (Row 1 0 1000))
Require ($owned[2].stamp -eq '3000') 'Stale owned PID hid a new descendant'
Require ($owned.ContainsKey(3)) 'Missed grandchild after PID replacement'
# Snapshot relationship refers to a different incarnation of the parent.
$owned = @{ 1 = @{ id = 1; stamp = '1000' } }
Discover-Owned @((Row 1 0 500), (Row 2 1 3000))
Require (!$owned.ContainsKey(2)) 'Accepted a mismatched snapshot parent'
# A parent that exits/recycles after ownership was recorded must not qualify.
$processes[1] = Process 5000
Discover-Owned @((Row 1 0 1000), (Row 2 1 3000))
Require ($owned.Count -eq 0) 'Retained a recycled owned parent'
# CIM rounds down to microseconds; do not reject a matching live process.
$owned = @{ 1 = @{ id = 1; stamp = '1001' } }
$processes = @{ 1 = (Process 1001); 2 = (Process 2009) }
Discover-Owned @((Row 1 0 1000), (Row 2 1 2000))
Require ($owned[2].stamp -eq '2009') 'Lost full live identity or rejected CIM precision'
`);
    const powershell = join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    expect(spawnSync(powershell, ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script], { encoding: 'utf8', timeout: 15000, maxBuffer: 16384 }), 0);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
test('success, inherited output and exact arguments', { skip: !windows }, () => {
  const args = ['a b', 'a"b', 'trailing\\', '', '雪'];
  const result = run('console.log(JSON.stringify(process.argv.slice(1))); console.error("stderr-ok")', [], args);
  expect(result, 0);
  assert.deepEqual(JSON.parse(result.stdout.trim()), args);
  assert.match(result.stderr, /stderr-ok/);
});
test('nonzero command exit is preserved', { skip: !windows }, () => expect(run('process.exit(7)'), 7));
test('launch failure fails closed', { skip: !windows }, () => {
  const result = spawnSync(process.execPath, [runner, '--', 'guard-run-nonexistent-executable-12345'], { encoding: 'utf8', timeout: 15000, maxBuffer: 16384 });
  expect(result, 125);
});
test('timeout terminates root and observed descendant', { skip: !windows }, () => {
  const directory = mkdtempSync(join(tmpdir(), 'guard-test-'));
  const marker = join(directory, 'pids.json');
  try {
    const source = `const {spawn}=require('node:child_process'); const c=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'}); require('node:fs').writeFileSync(${JSON.stringify(marker)},JSON.stringify([process.pid,c.pid])); setInterval(()=>{},1000);`;
    const result = run(source, ['--timeout-seconds', '3']);
    expect(result, 124);
    assert.match(result.stderr, /timeout/);
    for (const pid of JSON.parse(readFileSync(marker, 'utf8'))) assert.throws(() => process.kill(pid, 0), { code: 'ESRCH' });
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
test('unexpected watchdog death triggers identity-checked recovery', { skip: !windows }, () => {
  const directory = mkdtempSync(join(tmpdir(), 'guard-test-'));
  const marker = join(directory, 'pid.json');
  try {
    const source = `require('node:fs').writeFileSync(${JSON.stringify(marker)},JSON.stringify(process.pid)); setTimeout(()=>process.kill(process.ppid),1500); setInterval(()=>{},1000);`;
    const result = run(source);
    expect(result, 125);
    assert.match(result.stderr, /watchdog failed/);
    assert.throws(() => process.kill(JSON.parse(readFileSync(marker, 'utf8')), 0), { code: 'ESRCH' });
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
test('private-memory budget includes a descendant (64 MiB fixture)', { skip: !windows }, () => {
  // Parent remains small. Descendant touches 64 MiB; no large or runaway allocation.
  const source = `const {spawn}=require('node:child_process'); spawn(process.execPath,['-e','global.buffer=Buffer.alloc(64*1024*1024,1); setInterval(()=>{},1000)'],{stdio:'ignore'}); setInterval(()=>{},1000);`;
  const result = run(source, ['--memory-mb', '85']);
  expect(result, 126);
  assert.match(result.stderr, /memory budget exceeded/);
});
