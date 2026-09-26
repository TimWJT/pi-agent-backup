import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { Artefacts, JsonLines } from './runtime.ts';

test('housekeeping removes only known completed dead-owner runs by age/pressure', t => {
 const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pi-retention-test-'));
 const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'pi-retention-outside-'));
 const deadPid = 2147483646;
 const kill = process.kill.bind(process);
 t.mock.method(process, 'kill', (pid: number, signal: any) => {
  if (pid === deadPid) throw Object.assign(new Error('gone'), { code: 'ESRCH' });
  return kill(pid, signal);
 });
 const marker = (dir: string, time: number) => fs.writeFileSync(path.join(dir, 'complete.json'), JSON.stringify({ version: 2, pid: deadPid, time }));
 try {
  const active = new Artefacts(root);
  const pinned = new Artefacts(root); pinned.complete();
  const unknown = path.join(root, 'run-v2-unknown'); fs.mkdirSync(unknown); fs.writeFileSync(path.join(unknown, 'keep'), 'mine'); marker(unknown, 0);
  const unmarked = path.join(root, 'run-v2-unmarked'); fs.mkdirSync(unmarked);
  const link = path.join(root, 'run-v2-link'); fs.writeFileSync(path.join(outside, 'keep'), 'outside'); marker(outside, 0);
  fs.symlinkSync(outside, link, process.platform === 'win32' ? 'junction' : 'dir');
  const old = new Artefacts(root); marker(old.dir, Date.now() - 8 * 86400000);
  Artefacts.prune(root);
  assert.equal(fs.existsSync(old.dir), false, 'age eviction');
  const recent = [];
  for (let i = 0; i < 4; i++) { const run = new Artefacts(root); marker(run.dir, Date.now() - 1000 + i); recent.push(run.dir); }
  Artefacts.prune(root, 2);
  assert.deepEqual(recent.map(dir => fs.existsSync(dir)), [false, false, true, true]);
  for (const dir of [active.dir, pinned.dir, unknown, unmarked, link, outside]) assert.ok(fs.existsSync(dir), dir);
  assert.equal(fs.readFileSync(path.join(outside, 'keep'), 'utf8'), 'outside');
 } finally { fs.rmSync(root, { recursive: true, force: true }); fs.rmSync(outside, { recursive: true, force: true }); }
});

test('oversized image and aggregate records drain without hiding the next final answer', () => {
 const events: any[] = [], skipped: string[] = [];
 const parser = new JsonLines(e => events.push(e), 128, prefix => skipped.push(prefix));
 for (const type of ['message_end', 'agent_end']) {
  const line = JSON.stringify({ type, message: { role: 'toolResult', content: [{ type: 'image', data: 'x'.repeat(2000) }] } }) + '\n';
  for (let i = 0; i < line.length; i += 31) parser.push(Buffer.from(line.slice(i, i + 31)));
 }
 parser.push(Buffer.from('{"type":"message_end","message":{"role":"assistant","content":[{"type":"text","text":"final"}]}}'));
 parser.end();
 assert.equal(parser.skipped, 2); assert.equal(skipped.length, 2);
 assert.equal(events.length, 1); assert.equal(events[0].message.content[0].text, 'final');
});
