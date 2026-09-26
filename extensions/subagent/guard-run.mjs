#!/usr/bin/env node
// Windows-only, polling best-effort guard; not a hard OS memory limit or sandbox.
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function parseArgs(args) {
  const config = { timeoutSeconds: 120, memoryMB: 2048 };
  let i = 0;
  while (i < args.length && args[i] !== '--') {
    const key = { '--timeout-seconds': 'timeoutSeconds', '--memory-mb': 'memoryMB' }[args[i++]];
    if (!key) throw new Error('Unknown option; expected --timeout-seconds or --memory-mb');
    const value = Number(args[i++]);
    if (!Number.isFinite(value) || value <= 0 || value > 2147483647) throw new Error('Limits must be positive finite numbers (at most 2147483647)');
    config[key] = value;
  }
  if (args[i++] !== '--' || !args[i]) throw new Error('Usage: node guard-run.mjs [--timeout-seconds 120] [--memory-mb 2048] -- executable args...');
  return { ...config, command: args[i], args: args.slice(i + 1) };
}

// ProcessStartInfo on Windows PowerShell 5.1 requires a quoted argument string.
export function quoteArgument(value) {
  return '"' + value.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\+)$/, '$1$1') + '"';
}

// Shared with the mocked PID-reuse tests so they exercise the actual discovery code.
export const discoveryScript = String.raw`
function Snapshot-Identity($row) {
  if ($null -eq $row.CreationDate) { throw 'Process snapshot has no creation time' }
  return $row.CreationDate.ToUniversalTime().Ticks
}
function Same-SnapshotIdentity([long]$stamp, [long]$snapshot) {
  # CIM's datetime has microsecond precision; Process.StartTime has 100ns ticks.
  return ($stamp - ($stamp % 10)) -eq ($snapshot - ($snapshot % 10))
}
function Open-Process($id) {
  $p = [Diagnostics.Process]::GetProcessById($id)
  $null = $p.Handle
  return $p
}
function Discover-Owned($rows) {
  # Remove exited/recycled identities BEFORE skipping already-known PIDs.
  foreach ($entry in @($owned.Values)) {
    $p = Live $entry
    if ($null -eq $p) { $owned.Remove([int]$entry.id) }
    else { $p.Dispose() }
  }
  $snapshots = @{}
  foreach ($row in $rows) { $snapshots[[int]$row.ProcessId] = $row }
  do {
    $added = $false
    foreach ($row in $rows) {
      $id = [int]$row.ProcessId
      $parentID = [int]$row.ParentProcessId
      if ($owned.ContainsKey($id) -or !$owned.ContainsKey($parentID)) { continue }
      $parentRow = $snapshots[$parentID]
      if ($null -eq $parentRow) { continue }
      if (!(Same-SnapshotIdentity $owned[$parentID].stamp (Snapshot-Identity $parentRow))) { continue }
      $parent = Live $owned[$parentID]
      if ($null -eq $parent) { continue }
      $p = $null
      try {
        $p = Open-Process $id
        $stamp = Identity $p
        # The PID may have been reused since CIM captured this relationship.
        if (!$p.HasExited -and (Same-SnapshotIdentity $stamp (Snapshot-Identity $row)) -and
            [long]$stamp -ge [long]$owned[$parentID].stamp) {
          $owned[$id] = @{ id = $id; stamp = $stamp }
          $added = $true
        }
      } catch [ArgumentException] { }
      finally {
        if ($null -ne $p) { $p.Dispose() }
        $parent.Dispose()
      }
    }
  } while ($added)
}
`;

// An independent PowerShell process owns the child, its process handle, and the
// deadline. It still runs if the calling Node event loop stalls. No TS dependency.
// NODE_OPTIONS is inherited unchanged: the guard measures total private memory,
// not just V8's heap. Nothing changes the caller's environment.
const watchdog = String.raw`
param([string]$Directory, [switch]$Cleanup)
$ErrorActionPreference = 'Stop'
$config = Get-Content -LiteralPath (Join-Path $Directory 'config.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$statePath = Join-Path $Directory 'owned.json'
$resultPath = Join-Path $Directory 'result.json'
$taskkill = Join-Path $env:SystemRoot 'System32\taskkill.exe'
$owned = @{}
$root = $null
${discoveryScript}
function Identity($process) { return $process.StartTime.ToUniversalTime().Ticks.ToString() }
function Save-Owned {
  $entries = @($owned.Values | ForEach-Object { @{ id = $_.id; stamp = $_.stamp } })
  $json = ConvertTo-Json -InputObject $entries -Compress
  [IO.File]::WriteAllText($statePath + '.new', $json)
  if ([IO.File]::Exists($statePath)) { [IO.File]::Replace($statePath + '.new', $statePath, [NullString]::Value) }
  else { [IO.File]::Move($statePath + '.new', $statePath) }
}
function Live($entry) {
  try {
    $p = [Diagnostics.Process]::GetProcessById([int]$entry.id)
    # Retain a native handle across the identity check and taskkill invocation.
    $null = $p.Handle
    if (!$p.HasExited -and (Identity $p) -eq $entry.stamp) { return $p }
    $p.Dispose()
  } catch [ArgumentException] { }
  catch [InvalidOperationException] { if ($null -ne $p -and $p.HasExited) { $p.Dispose() } else { throw } }
  return $null
}
function Stop-Owned {
  # Recheck creation time immediately before taskkill; never kill by image name.
  $failed = $false
  foreach ($entry in @($owned.Values)) {
    try {
    $p = Live $entry
    if ($null -ne $p) {
      try {
        # Native stderr (for an exit race) is not a PowerShell terminating error.
        $ErrorActionPreference = 'Continue'
        & $taskkill /PID $entry.id /T /F *> $null
        $ErrorActionPreference = 'Stop'
        if (!$p.WaitForExit(2000)) { throw 'Owned process did not stop' }
      } finally { $ErrorActionPreference = 'Stop'; $p.Dispose() }
    }
    } catch { $failed = $true }
  }
  if ($failed) { throw 'Some owned processes could not be stopped' }
}
if ($Cleanup) {
  if (Test-Path -LiteralPath $statePath) {
    foreach ($entry in @(Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json)) { $owned[[int]$entry.id] = $entry }
    Stop-Owned
  }
  exit 125
}
$code = 125
$reason = 'monitor failure'
try {
  if (!(Test-Path -LiteralPath $taskkill)) { throw 'taskkill unavailable' }
  # Ensure process discovery works BEFORE launching work.
  $null = @(Get-CimInstance Win32_Process -Property ProcessId,ParentProcessId,CreationDate)
  $owner = [Diagnostics.Process]::GetProcessById([int]$config.ownerPID)
  $ownerStamp = Identity $owner
  $owner.Dispose()
  $info = New-Object Diagnostics.ProcessStartInfo
  $info.FileName = $config.command
  $info.Arguments = $config.arguments
  $info.WorkingDirectory = $config.cwd
  $info.UseShellExecute = $false
  $root = New-Object Diagnostics.Process
  $root.StartInfo = $info
  $clock = [Diagnostics.Stopwatch]::StartNew()
  if (!$root.Start()) { throw 'Could not launch command' }
  $rootEntry = @{ id = $root.Id; stamp = (Identity $root) }
  $owned[$root.Id] = $rootEntry
  Save-Owned
  while ($true) {
    $parent = Live @{ id = $config.ownerPID; stamp = $ownerStamp }
    if ($null -eq $parent) { throw 'Calling runner exited' }
    $parent.Dispose()
    $rows = @(Get-CimInstance Win32_Process -Property ProcessId,ParentProcessId,CreationDate)
    # Multiple passes discover grandchildren regardless of snapshot ordering.
    Discover-Owned $rows
    Save-Owned
    [long]$bytes = 0
    foreach ($entry in @($owned.Values)) {
      $p = Live $entry
      if ($null -ne $p) {
        try { $p.Refresh(); $bytes += $p.PrivateMemorySize64 } finally { $p.Dispose() }
      }
    }
    if ($bytes -gt ([double]$config.memoryMB * 1MB)) { $code = 126; $reason = 'memory budget exceeded'; break }
    if ($clock.Elapsed.TotalSeconds -ge $config.timeoutSeconds) { $code = 124; $reason = 'timeout'; break }
    if ($root.HasExited) { $code = $root.ExitCode; $reason = 'command exited'; break }
    Start-Sleep -Milliseconds 500
  }
} catch {
  # Do not include command arguments or environment values in diagnostics.
  $code = 125
  $reason = 'monitor or launch failure'
} finally {
  try { Stop-Owned } catch { $code = 125; $reason = 'cleanup failure' }
  if ($null -ne $root) {
    # If initial identity/state recording failed, the retained process handle is
    # still a safe way to terminate the root (rather than trusting a recycled PID).
    try { if (!$root.HasExited) { $root.Kill() } } catch { $code = 125; $reason = 'cleanup failure' }
    $root.Dispose()
  }
  [IO.File]::WriteAllText($resultPath, (ConvertTo-Json -Compress @{ code = $code; reason = $reason }))
}
exit $code
`;

export async function main(args) {
  let config;
  try { config = parseArgs(args); } catch (error) { console.error(error.message); return 125; }
  if (process.platform !== 'win32') { console.error('guard-run: Windows only; no command was launched.'); return 125; }
  const directory = mkdtempSync(join(tmpdir(), 'guard-run-'));
  const powershell = join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  const script = join(directory, 'watchdog.ps1');
  let monitor;
  let interrupted = false;
  const onSignal = () => { interrupted = true; monitor?.kill(); };
  const launch = (cleanup = false) => spawn(powershell, ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script, '-Directory', directory, ...(cleanup ? ['-Cleanup'] : [])], { stdio: 'inherit', windowsHide: true });
  const wait = (child) => new Promise((done) => { child.once('error', () => done(false)); child.once('exit', () => done(true)); });
  try {
    writeFileSync(script, watchdog);
    writeFileSync(join(directory, 'config.json'), JSON.stringify({ ...config, arguments: config.args.map(quoteArgument).join(' '), cwd: process.cwd(), ownerPID: process.pid }));
    process.on('SIGINT', onSignal);
    process.on('SIGTERM', onSignal);
    monitor = launch();
    await wait(monitor);
    try {
      const result = JSON.parse(readFileSync(join(directory, 'result.json'), 'utf8'));
      if (result.reason !== 'command exited') console.error(`guard-run: ${result.reason}`);
      return interrupted ? 125 : result.code;
    } catch {
      // Unexpected watchdog exit: independent recovery rechecks recorded identities.
      await wait(launch(true));
      console.error('guard-run: watchdog failed; attempted owned-process cleanup');
      return 125;
    }
  } finally {
    process.off('SIGINT', onSignal);
    process.off('SIGTERM', onSignal);
    rmSync(directory, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
