import { test } from "node:test";
import assert from "node:assert/strict";
import childProcess from "node:child_process";
import { syncBuiltinESMExports } from "node:module";
import { EventEmitter, getEventListeners } from "node:events";
import { PassThrough } from "node:stream";
import { childEnvironment, LIMITS, Processes } from "./runtime.ts";

test("heap parsing uses complete tokens and preserves signed lower limits", () => {
 for (const original of ['--max-old-space-size=+512', '--max_old_space_size "+512"', '"--max-old-space-size=512"']) {
  const env = { NODE_OPTIONS: original, OTHER: "kept" };
  assert.deepEqual(childEnvironment(env), { ...env, NODE_OPTIONS: original + " --max-old-space-size=512" });
  assert.equal(env.NODE_OPTIONS, original);
 }
 for (const original of ['--require="./--max-old-space-size=16.js"', '--title="a --max-old-space-size=32"', '--max-old-space-size-extra=16']) {
  assert.equal(childEnvironment({ NODE_OPTIONS: original }).NODE_OPTIONS, original + " --max-old-space-size=4096");
 }
 assert.equal(childEnvironment({ NODE_OPTIONS: '--max-old-space-size=8192 --max_old_space_size=+256' }).NODE_OPTIONS,
  '--max-old-space-size=8192 --max_old_space_size=+256 --max-old-space-size=256');
});

test("ambiguous explicit heap settings remain untouched rather than silently overridden", () => {
 for (const original of [
  '--max-old-space-size=512junk', '--max-old-space-size=0', '--max-old-space-size=-512',
  '--max-old-space-size=1.5', '--max-old-space-size=', '--max-old-space-size',
  '--max-old-space-size=9007199254740993', "--max-old-space-size='512'",
  '--max-old-space-size="512', '--max-old-space-size=256 --max-old-space-size=oops',
 ]) assert.equal(childEnvironment({ NODE_OPTIONS: original }).NODE_OPTIONS, original);
});

// Exercise the POSIX lifecycle on Windows too, without signalling real PIDs.
for (const earlyClose of [true, false]) test(`POSIX owned group is force-killed after ${earlyClose ? "early close on abort" : "pipe drain timeout"}`, async t => {
 const platform = Object.getOwnPropertyDescriptor(process, "platform")!;
 const oldKillMs = LIMITS.killMs, oldDrainMs = LIMITS.drainMs;
 const signals: [number, string | number | undefined][] = [];
 const proc = Object.assign(new EventEmitter(), { pid: 123456, stdout: new PassThrough(), stderr: new PassThrough(), kill() { throw Error("must signal owned group, not leader PID"); } });
 const controller = new AbortController();
 const manager = new Processes();
 try {
  Object.defineProperty(process, "platform", { value: "linux" });
  LIMITS.killMs = 20; LIMITS.drainMs = 30;
  t.mock.method(childProcess, "spawn", (_command: unknown, _args: unknown, options: any) => {
   assert.equal(options.detached, true);
   queueMicrotask(() => {
    if (earlyClose) controller.abort();
    else proc.emit("exit", 0, null);
   });
   return proc;
  });
  t.mock.method(process, "kill", (pid: number, signal: string | number | undefined) => {
   signals.push([pid, signal]);
   if (signal === "SIGTERM") queueMicrotask(() => {
    proc.emit("exit", null, "SIGTERM"); proc.emit("close", null, "SIGTERM");
   });
   return true;
  });
  syncBuiltinESMExports();
  const result = await manager.run("fake", [], { cwd: process.cwd(), signal: controller.signal, stdout() {}, stderr() {} });
  assert.deepEqual(signals, earlyClose ? [[-123456, "SIGTERM"], [-123456, "SIGKILL"]] : [[-123456, "SIGKILL"]]);
  assert.equal(result.aborted, earlyClose);
  if (!earlyClose) assert.match(result.error ?? "", /drain deadline/);
  assert.equal(proc.stdout.destroyed, true);
  assert.equal(proc.stderr.destroyed, true);
  assert.equal(getEventListeners(controller.signal, "abort").length, 0);
  await manager.shutdown();
  assert.equal(signals.length, earlyClose ? 2 : 1);
 } finally {
  t.mock.restoreAll(); syncBuiltinESMExports();
  Object.defineProperty(process, "platform", platform);
  LIMITS.killMs = oldKillMs; LIMITS.drainMs = oldDrainMs;
 }
});

test("real POSIX descendant ignoring TERM is killed even with separate pipes", { skip: process.platform === "win32", timeout: 10000 }, async () => {
 const manager = new Processes();
 const controller = new AbortController();
 let pid = 0;
 try {
  const descendant = "process.on('SIGTERM',()=>{});console.log(process.pid);setInterval(()=>{},1000)";
  const root = `const {spawn}=require('node:child_process');const c=spawn(process.execPath,['-e',${JSON.stringify(descendant)}],{stdio:['ignore','pipe','ignore']});c.stdout.once('data',d=>console.log(d.toString().trim()));setInterval(()=>{},1000)`;
  const result = await manager.run(process.execPath, ["-e", root], { cwd: process.cwd(), signal: controller.signal, stderr() {}, stdout(data) { pid = Number(data.toString().trim()); controller.abort(); } });
  assert.equal(result.aborted, true); assert.ok(pid > 0);
  // Give the OS time to reap the descendant after group SIGKILL.
  for (let i = 0; i < 100; i++) {
   try { process.kill(pid, 0); } catch { return; }
   await new Promise(resolve => setTimeout(resolve, 20));
  }
  assert.fail("descendant survived group escalation (or was not reaped)");
 } finally {
  if (pid) { try { process.kill(pid, "SIGKILL"); } catch {} }
  await manager.shutdown();
 }
});
