import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Installed Pi loader only: no settings/auth/session/model initialisation.
const loaderPath = path.join(path.dirname(process.execPath), 'node_modules/@earendil-works/pi-coding-agent/dist/core/extensions/loader.js');
const { loadExtensions } = await import(pathToFileURL(loaderPath).href);
const here = path.dirname(fileURLToPath(import.meta.url));

test('installed extension load + offline single, parallel, chain, cancellation and shutdown', async () => {
 const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pi-subagent-extension-test-'));
 const oldDir = process.env.PI_CODING_AGENT_DIR;
 const oldScript = process.argv[1];
 try {
  process.env.PI_CODING_AGENT_DIR = root;
  process.argv[1] = path.join(here, 'fixture.cjs');
  fs.mkdirSync(path.join(root, 'agents'));
  fs.writeFileSync(path.join(root, 'agents/test.md'), '---\nname: test\ndescription: offline fixture\n---\n');
  const loaded = await loadExtensions([path.join(here, 'index.ts')], root);
  assert.deepEqual(loaded.errors, []);
  const extension = loaded.extensions[0];
  const registered = extension.tools.get('subagent');
  const tool = registered.definition ?? registered;
  const ctx = { cwd: root, hasUI: false, thinkingLevel: 'max' };
  for (const params of [
   { agent: 'test', task: 'single' },
   { tasks: [{ agent: 'test', task: 'one' }, { agent: 'test', task: 'two' }] },
   { chain: [{ agent: 'test', task: 'one' }, { agent: 'test', task: '{previous}' }] },
  ]) {
   const result = await tool.execute('test', params, undefined, () => { throw Error('progress fixture'); }, ctx);
   assert.ok(Buffer.byteLength(result.content[0].text) < 30000);
   assert.match(result.content[0].text, /Raw output and task:/);
   for (const r of result.details.results) {
    assert.equal(r.exitCode, 0); assert.equal(r.usage.input, 0);
    assert.ok(r.messages.length <= 8);
    assert.ok(Buffer.byteLength(r.stderr) <= 16384);
    assert.ok(Buffer.byteLength(JSON.stringify(r.messages)) < 270000);
    assert.equal(fs.statSync(path.join(r.artefacts, 'stdout.jsonl')).size + fs.statSync(path.join(r.artefacts, 'task.txt')).size, 8 * 1024 * 1024);
    assert.equal(r.captureTruncated, true);
    assert.equal(fs.readFileSync(r.resultFile, 'utf8'), 'hello 😀 ' + 'x'.repeat(35000));
    assert.equal(r.usage.turns, 12, 'aggregate agent_end must not double-count messages');
   }
  }
  const exact = '  exact $& 😀\nsecond line\n';
  const chained = await tool.execute('exact', { chain: [{ agent: 'test', task: 'small-exact' }, { agent: 'test', task: 'echo:{previous}' }] }, undefined, undefined, ctx);
  assert.equal(chained.details.results[1].finalText, exact);
  assert.equal(fs.readFileSync(path.join(chained.details.results[1].artefacts, 'task.txt'), 'utf8'), 'echo:' + exact);
  const medium = await tool.execute('medium', { chain: [{ agent: 'test', task: 'medium-exact' }, { agent: 'test', task: 'echo:{previous}' }] }, undefined, undefined, ctx);
  assert.equal(medium.details.results[1].finalText, 'm'.repeat(20000) + '\nTHE END', 'chain must not use 12 KiB display preview');
  const longAnswer = await tool.execute('long', { agent: 'test', task: 'large-text' }, undefined, undefined, ctx);
  assert.equal(longAnswer.details.results[0].exitCode, 0);
  assert.equal(fs.readFileSync(longAnswer.details.results[0].resultFile, 'utf8'), 'L'.repeat(1200000) + '\nFULL END');
  const large = await tool.execute('large', { chain: [{ agent: 'test', task: 'large' }, { agent: 'test', task: 'echo:{previous}' }] }, undefined, undefined, ctx);
  assert.match(large.details.results[1].finalText, /full result is in .*result.txt/);
  assert.ok(fs.existsSync(large.details.results[0].resultFile));
  const handlers = extension.handlers.get('tool_result');
  assert.ok(handlers.length);
  for (const params of [{ agent: 'test', task: 'fail' }, { tasks: [{ agent: 'test', task: 'fail' }] }, { chain: [{ agent: 'test', task: 'fail' }] }, {}]) {
   const failed = await tool.execute('failure', params, undefined, undefined, ctx);
   let actual = { toolName: 'subagent', ...failed, isError: false };
   for (const handler of handlers) actual = { ...actual, ...await handler(actual, ctx) };
   assert.equal(actual.isError, true, 'Pi tool_result hook marks failure, not the ignored execute field');
  }
  const abort = new AbortController(); abort.abort();
  const cancelled = await tool.execute('test', { tasks: [{ agent: 'test', task: 'never launched' }] }, abort.signal, () => Promise.reject(Error('async progress')), ctx);
  assert.equal(cancelled.details.results[0].stopReason, 'aborted');
  assert.equal(cancelled.details.results[0].artefacts, undefined);
  for (const handler of extension.handlers.get('session_shutdown')) await handler({}, ctx);
  for (const handler of extension.handlers.get('session_shutdown')) await handler({}, ctx);
 } finally {
  process.argv[1] = oldScript;
  if (oldDir === undefined) delete process.env.PI_CODING_AGENT_DIR; else process.env.PI_CODING_AGENT_DIR = oldDir;
  fs.rmSync(root, { recursive: true, force: true });
 }
});
