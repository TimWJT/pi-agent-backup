import { test } from "node:test";
import assert from "node:assert/strict";
import { getEventListeners } from "node:events";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { Artefacts, JsonLines, Processes, childEnvironment, clip, safeCallback, windowsKillArgs, mapWithConcurrencyLimit, expandTask } from "./runtime.ts";

test("child heap options preserve unrelated flags and lower limits without mutating parent", () => {
 const env = { NODE_OPTIONS: '--trace-warnings --max_old_space_size="512"', OTHER: "yes" };
 assert.equal(childEnvironment(env).NODE_OPTIONS, env.NODE_OPTIONS + " --max-old-space-size=512");
 assert.equal(env.NODE_OPTIONS, '--trace-warnings --max_old_space_size="512"');
 assert.equal(childEnvironment({ NODE_OPTIONS: "--max-old-space-size 8192" }).NODE_OPTIONS, "--max-old-space-size 8192 --max-old-space-size=4096");
 assert.equal(childEnvironment({}).NODE_OPTIONS, "--max-old-space-size=4096");
});
test("JSON framing handles null, malformed events, split UTF8, final line and throwing callbacks", async () => {
 const events: any[] = [];
 const parser = new JsonLines(e => { events.push(e); safeCallback(() => { if (e.throw) throw Error("progress"); }, undefined); }, 100);
 const data = Buffer.from('null\n[]\n5\ninvalid\n{"throw":true}\n{"text":"😀 ok"}');
 for (const byte of data) parser.push(Buffer.from([byte]));
 parser.end();
 assert.equal(events.length, 2);
 assert.equal(events[1].text, "😀 ok");
 safeCallback(() => Promise.reject(Error("async progress")), undefined);
 await new Promise(resolve => setImmediate(resolve));
 const skipped: any[] = [];
 const bounded = new JsonLines(e => skipped.push(e), 8);
 bounded.push(Buffer.from('012345678')); bounded.push(Buffer.from('9\n{"ok":1}\n'));
 assert.equal(bounded.skipped, 1); assert.deepEqual(skipped, [{ ok: 1 }]);
 assert.throws(() => new JsonLines(() => { throw Error("disk full"); }).push(Buffer.from('{}\n')), /disk full/);
 assert.ok(Buffer.byteLength(clip("😀".repeat(100), 64)) <= 64);
});
test("chain substitution is literal and bounded before expansion", () => {
 assert.equal(expandTask("{previous}", "$&"), "$&");
 assert.throws(() => expandTask("{previous}{previous}", "x".repeat(40), 64), /exceeds/);
});
test("artefacts cap diagnostics, keep full results, and never stop at run 65", () => {
 const root = fs.mkdtempSync(path.join(os.tmpdir(), "pi-artefact-test-"));
 try {
  const store = new Artefacts(root, 12, 2);
  store.append("stdout.jsonl", "hello"); store.append("stderr.txt", "error");
  assert.equal(fs.readFileSync(path.join(store.dir, "stdout.jsonl"), "utf8"), "hello");
  store.append("stdout.jsonl", "overflow");
  assert.equal(store.truncated, true);
  assert.equal(fs.readFileSync(path.join(store.dir, "stdout.jsonl"), "utf8"), "helloov");
  assert.equal(fs.readFileSync(store.result("complete answer"), "utf8"), "complete answer");
  store.complete();
  const dirs = new Set([store.dir]);
  for (let i = 0; i < 100; i++) { const next = new Artefacts(root, 12, 2); next.complete(); dirs.add(next.dir); }
  assert.equal(dirs.size, 101);
  assert.ok(fs.existsSync(store.dir), "live owner pins completed chain results");
 } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
const options = (signal?: AbortSignal) => ({ cwd: process.cwd(), signal, stdout: (_: Buffer) => {}, stderr: (_: Buffer) => {} });
test("real exit code, spawn failure, signal listener cleanup and shutdown idempotence", async () => {
 const manager = new Processes(); const abort = new AbortController();
 const result = await manager.run(process.execPath, ["-e", "process.exit(7)"], options(abort.signal));
 assert.equal(result.code, 7); assert.equal(result.aborted, false);
 assert.equal(getEventListeners(abort.signal, "abort").length, 0);
 assert.equal(getEventListeners(manager.shutdownSignal.signal, "abort").length, 0);
 const fail = await manager.run("pi-does-not-exist-test", [], options());
 assert.equal(fail.code, 1); assert.match(fail.error ?? "", /ENOENT/);
 await manager.shutdown(); await manager.shutdown();
 assert.equal((await manager.run(process.execPath, ["-e", "process.exit(0)"], options())).aborted, true);
});
test("abort terminates owned child tree; shutdown also drains active child", async () => {
 const manager = new Processes(); const abort = new AbortController();
 let childPid = 0;
 const result = await manager.run(process.execPath, ["-e", `const {spawn}=require('node:child_process');const c=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});console.log(c.pid);setInterval(()=>{},1000)`], {
  ...options(abort.signal), stdout(data) { childPid = Number(data.toString().trim()); abort.abort(); },
 });
 assert.equal(result.aborted, true); assert.notEqual(result.code, 0); assert.ok(childPid > 0);
 assert.throws(() => process.kill(childPid, 0));
 assert.equal(getEventListeners(abort.signal, "abort").length, 0);
 let ready!: () => void; const started = new Promise<void>(r => { ready = r; });
 const active = manager.run(process.execPath, ["-e", "console.log('ready');setInterval(()=>{},1000)"], { ...options(), stdout: () => ready() });
 await started; await manager.shutdown(); assert.equal((await active).aborted, true);
 assert.deepEqual(windowsKillArgs(123), ["/PID", "123", "/T", "/F"]);
});
test("root exit with inherited pipe has a bounded drain", async () => {
 const manager = new Processes(); let pid = 0;
 const start = Date.now();
 try {
  const result = await manager.run(process.execPath, ["-e", `const {spawn}=require('node:child_process'); const c=spawn(process.execPath,['-e','setTimeout(()=>{},6000)'],{stdio:['ignore',process.stdout,'ignore']}); console.log(c.pid);c.unref();`], { ...options(), stdout(data) { pid = Number(data.toString().trim()); } });
  assert.equal(result.code, 0);
  // Windows closes these inherited handles immediately; POSIX holds the pipe open.
  if (process.platform !== "win32") assert.match(result.error ?? "", /drain deadline/);
  assert.ok(Date.now() - start < 5000);
 } finally { if (pid) { try { process.kill(pid); } catch {} } await manager.shutdown(); }
});
test("callback failures terminate safely and cancelled queued jobs never launch", async () => {
 const manager = new Processes();
 const failed = await manager.run(process.execPath, ["-e", "console.log('data');setInterval(()=>{},1000)"], { ...options(), stdout() { throw Error("disk full"); } });
 assert.match(failed.error ?? "", /disk full/);
 let cancelled = false; const launched: number[] = [];
 const results = await mapWithConcurrencyLimit([0, 1, 2, 3], 2, async i => { launched.push(i); await new Promise(r => setImmediate(r)); cancelled = true; return i; }, () => cancelled, () => -1);
 assert.deepEqual(launched, [0, 1]); assert.deepEqual(results, [0, 1, -1, -1]);
 await manager.shutdown();
});
