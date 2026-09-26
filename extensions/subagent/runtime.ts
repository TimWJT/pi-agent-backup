import { spawn, type ChildProcess } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { StringDecoder } from "node:string_decoder";
import { setMaxListeners } from "node:events";

// Heap only, not total process memory. No change to the coordinator environment.
export const LIMITS = {
 heapMB: 4096, lineBytes: 16 * 1024 * 1024, messageBytes: 32 * 1024,
 messages: 8, stderrBytes: 16 * 1024, outputBytes: 12 * 1024,
 taskBytes: 16 * 1024, artefactBytes: 8 * 1024 * 1024, artefactSlots: 64,
 killMs: 1500, drainMs: 2000,
};
export function clip(text: string, bytes: number): string {
 if (Buffer.byteLength(text) <= bytes) return text;
 return Buffer.from(text).subarray(0, Math.max(0, bytes - 32)).toString("utf8").replace(/\uFFFD$/, "") + "\n[truncated; see artefacts]";
}
export function expandTask(task: string, previous: string, maxBytes = 128 * 1024): string {
 const count = task.match(/\{previous\}/g)?.length ?? 0;
 if (Buffer.byteLength(task) + count * (Buffer.byteLength(previous) - 10) > maxBytes) {
  throw new Error("Expanded chain task exceeds 128 KiB; pass the previous artefact path instead of repeating its output.");
 }
 return task.replace(/\{previous\}/g, () => previous);
}
export function childEnvironment(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
 const original = env.NODE_OPTIONS ?? "";
 // NODE_OPTIONS uses double quotes, not shell quoting. Inspect complete tokens
 // so a preload filename containing an option name cannot change the heap cap.
 const tokens: string[] = [];
 let token = "", quoted = false, started = false;
 for (let i = 0; i < original.length; i++) {
  const char = original[i];
  if (char === '"') { quoted = !quoted; started = true; }
  else if (char === "\\" && quoted) {
   if (++i === original.length) return { ...env };
   token += original[i]; started = true;
  } else if (char === " " && !quoted) {
   if (started) tokens.push(token);
   token = ""; started = false;
  } else { token += char; started = true; }
 }
 if (quoted) return { ...env };
 if (started) tokens.push(token);
 const limits: number[] = [];
 for (let i = 0; i < tokens.length; i++) {
  const match = /^--max[-_]old[-_]space[-_]size(?:=(.*))?$/.exec(tokens[i]);
  if (!match) continue;
  const value = match[1] ?? tokens[++i];
  // Keep explicit but ambiguous settings (including zero) for Node to handle.
  // Appending a default could silently replace a lower limit or hide an error.
  if (value === undefined || !/^\+?\d+$/.test(value)) return { ...env };
  const limit = Number(value);
  if (!Number.isSafeInteger(limit) || limit <= 0) return { ...env };
  limits.push(limit);
 }
 const heap = Math.min(LIMITS.heapMB, ...limits);
 return { ...env, NODE_OPTIONS: `${original} --max-old-space-size=${heap}`.trim() };
}
export function safeCallback<T>(fn: ((value: T) => unknown) | undefined, value: T): void {
 try { const result = fn?.(value); if (result && typeof (result as Promise<unknown>).then === "function") void Promise.resolve(result).catch(() => {}); } catch { /* progress is best effort */ }
}

// Only marked, completed runs from exited owners are eligible for housekeeping.
// Live owners pin their results, including every previous step in an active chain.
export class Artefacts {
 readonly dir: string;
 private bytes = 0;
 truncated = false;
 constructor(root: string, private quota = LIMITS.artefactBytes, pressure = LIMITS.artefactSlots) {
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  Artefacts.prune(root, pressure);
  this.dir = fs.mkdtempSync(path.join(root, "run-v2-"));
  fs.chmodSync(this.dir, 0o700);
 }
 static prune(root: string, pressure = LIMITS.artefactSlots): void {
  const candidates: { dir: string; time: number }[] = [];
  for (const name of fs.readdirSync(root)) {
   if (!/^run-v2-[A-Za-z0-9]+$/.test(name)) continue;
   const dir = path.join(root, name);
   try {
    if (!fs.lstatSync(dir).isDirectory() || fs.lstatSync(dir).isSymbolicLink()) continue;
    const files = fs.readdirSync(dir);
    if (files.some(f => !["complete.json", "stdout.jsonl", "stderr.txt", "task.txt", "result.txt", "capture.txt"].includes(f) || !fs.lstatSync(path.join(dir, f)).isFile())) continue;
    const marker = JSON.parse(fs.readFileSync(path.join(dir, "complete.json"), "utf8"));
    if (marker.version !== 2 || !Number.isInteger(marker.pid) || marker.pid <= 0 || !Number.isFinite(marker.time)) continue;
    try { process.kill(marker.pid, 0); continue; } catch (e: any) { if (e.code !== "ESRCH") continue; }
    candidates.push({ dir, time: marker.time });
   } catch { /* unknown, incomplete or concurrently removed: leave alone */ }
  }
  candidates.sort((a, b) => a.time - b.time);
  for (let i = 0; i < candidates.length; i++) {
   if (Date.now() - candidates[i].time < 7 * 86400000 && candidates.length - i <= pressure) continue;
   try { fs.rmSync(candidates[i].dir, { recursive: true }); } catch { /* best effort */ }
  }
 }
 complete(): void {
  fs.writeFileSync(path.join(this.dir, "complete.json"), JSON.stringify({ version: 2, pid: process.pid, time: Date.now() }), { mode: 0o600 });
 }
 result(text: string): string {
  const file = path.join(this.dir, "result.txt");
  fs.writeFileSync(file, text, { mode: 0o600 });
  return file;
 }
 append(name: "stdout.jsonl" | "stderr.txt" | "task.txt", data: Buffer | string): void {
  let buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
  if (name !== "task.txt" && this.bytes + buffer.length > this.quota) {
   buffer = buffer.subarray(0, Math.max(0, this.quota - this.bytes));
   if (!this.truncated) fs.writeFileSync(path.join(this.dir, "capture.txt"), "Diagnostic capture truncated at quota. result.txt is captured separately.\n", { mode: 0o600 });
   this.truncated = true;
  }
  if (!buffer.length) return;
  const file = path.join(this.dir, name);
  const fd = fs.openSync(file, "a", 0o600);
  try {
   let written = 0;
   while (written < buffer.length) {
    const count = fs.writeSync(fd, buffer, written, buffer.length - written);
    if (!count) throw new Error(`Cannot write artefact: ${file}`);
    written += count;
    this.bytes += count;
   }
  } finally { fs.closeSync(fd); }
 }
}

export class JsonLines {
 private decoder = new StringDecoder("utf8");
 private pending = "";
 private pendingBytes = 0;
 private dropping = false;
 skipped = 0;
 constructor(private consume: (event: any) => void, private maxBytes = LIMITS.lineBytes, private onSkip?: (prefix: string) => void) {}
 push(chunk: Buffer): void {
  const text = this.decoder.write(chunk);
  let start = 0;
  while (start < text.length) {
   const end = text.indexOf("\n", start);
   const piece = text.slice(start, end < 0 ? text.length : end);
   if (!this.dropping) {
    const bytes = Buffer.byteLength(piece);
    if (this.pendingBytes + bytes > this.maxBytes) {
     this.onSkip?.((this.pending || piece).slice(0, 512));
     this.pending = ""; this.pendingBytes = 0; this.dropping = true; this.skipped++;
    } else { this.pending += piece; this.pendingBytes += bytes; }
   }
   if (end < 0) break;
   if (!this.dropping) this.line(this.pending);
   this.pending = ""; this.pendingBytes = 0; this.dropping = false; start = end + 1;
  }
 }
 end(): void { if (!this.dropping) this.line(this.pending + this.decoder.end()); this.pending = ""; this.pendingBytes = 0; }
 private line(line: string): void {
  let event: any;
  try { event = JSON.parse(line); } catch { return; }
  if (!event || typeof event !== "object" || Array.isArray(event)) return;
  this.consume(event);
 }
}

export function windowsKillArgs(pid: number): string[] { return ["/PID", String(pid), "/T", "/F"]; }
function killTree(proc: ChildProcess, force: boolean): void {
 if (!proc.pid) return;
 if (process.platform === "win32") {
  const killer = spawn("taskkill", windowsKillArgs(proc.pid), { stdio: "ignore", windowsHide: true });
  killer.on("error", () => { try { proc.kill("SIGKILL"); } catch {} });
  const timer = setTimeout(() => { try { killer.kill(); } catch {} }, LIMITS.drainMs);
  killer.once("close", () => clearTimeout(timer));
 } else {
  try { process.kill(-proc.pid, force ? "SIGKILL" : "SIGTERM"); } catch { /* Never target a possibly reused leader PID. */ }
 }
}
export class Processes {
 private active = new Set<() => Promise<unknown>>();
 readonly shutdownSignal = new AbortController();
 constructor() { setMaxListeners(0, this.shutdownSignal.signal); }
 async shutdown(): Promise<void> {
  this.shutdownSignal.abort();
  await Promise.all([...this.active].map(stop => stop()));
 }
 run(command: string, args: string[], options: { cwd: string; signal?: AbortSignal; stdout: (data: Buffer) => void; stderr: (data: Buffer) => void }): Promise<{ code: number; signal: string | null; aborted: boolean; error?: string }> {
  const signal = options.signal;
  if (signal?.aborted || this.shutdownSignal.signal.aborted) return Promise.resolve({ code: 1, signal: null, aborted: true });
  let stop!: () => Promise<unknown>;
  const promise = new Promise<{ code: number; signal: string | null; aborted: boolean; error?: string }>(resolve => {
   let proc: ChildProcess;
   try { proc = spawn(command, args, { cwd: options.cwd, env: childEnvironment(process.env), shell: false, detached: process.platform !== "win32", stdio: ["ignore", "pipe", "pipe"], windowsHide: true }); }
   catch (e) { resolve({ code: 1, signal: null, aborted: false, error: String(e) }); return; }
   let settled = false, aborted = false, exited = false, closed = false, escalating = false;
   let code: number | null = null, exitSignal: string | null = null, error: string | undefined;
   let killTimer: ReturnType<typeof setTimeout> | undefined, drainTimer: ReturnType<typeof setTimeout> | undefined;
   const finish = () => {
    if (settled) return;
    settled = true;
    clearTimeout(killTimer); clearTimeout(drainTimer);
    signal?.removeEventListener("abort", abort);
    this.shutdownSignal.signal.removeEventListener("abort", abort);
    this.active.delete(stop);
    proc.stdout?.destroy(); proc.stderr?.destroy();
    resolve({ code: code ?? 1, signal: exitSignal, aborted, error });
   };
   const terminate = () => {
    if (settled || killTimer) return;
    if (!exited || process.platform !== "win32") killTree(proc, false);
    escalating = process.platform !== "win32";
    killTimer = setTimeout(() => {
     if (!exited || process.platform !== "win32") killTree(proc, true);
     escalating = false;
     if (closed) finish();
    }, LIMITS.killMs);
    drainTimer ??= setTimeout(() => {
     error ??= "Subagent cleanup timed out; exit not confirmed";
     if (!exited || process.platform !== "win32") killTree(proc, true);
     finish();
    }, LIMITS.killMs + LIMITS.drainMs);
   };
   const abort = () => { aborted = true; terminate(); };
   stop = () => { abort(); return promise; };
   this.active.add(stop);
   const data = (fn: (chunk: Buffer) => void) => (chunk: Buffer) => {
    if (settled || error) return;
    try { fn(chunk); } catch (e) { error = String(e); terminate(); }
   };
   proc.stdout?.on("data", data(options.stdout)); proc.stderr?.on("data", data(options.stderr));
   proc.stdout?.on("error", e => { error = String(e); terminate(); });
   proc.stderr?.on("error", e => { error = String(e); terminate(); });
   proc.once("error", e => { error = String(e); if (!proc.pid) finish(); else terminate(); });
   proc.once("exit", (status, sig) => {
    if (settled) return;
    exited = true; code = status; exitSignal = sig;
    drainTimer ??= setTimeout(() => {
     error ??= "Subagent pipes did not close before drain deadline";
     // Only POSIX children have an owned, detached process group. Do not send
     // taskkill an exited Windows PID, which might now belong to another task.
     if (process.platform !== "win32") killTree(proc, true);
     finish();
    }, LIMITS.drainMs);
   });
   proc.once("close", (status, sig) => {
    closed = true; code ??= status; exitSignal ??= sig;
    // Closing the leader's pipes says nothing about descendants using other
    // handles. Keep the group escalation alive until SIGKILL has been sent.
    if (!escalating) finish();
   });
   signal?.addEventListener("abort", abort, { once: true });
   this.shutdownSignal.signal.addEventListener("abort", abort, { once: true });
   if (signal?.aborted || this.shutdownSignal.signal.aborted) abort();
  });
  return promise;
 }
}

export async function mapWithConcurrencyLimit<T, R>(items: T[], concurrency: number, fn: (item: T, index: number) => Promise<R>, cancelled: () => boolean, skipped: (item: T, index: number) => R): Promise<R[]> {
 const results: R[] = new Array(items.length);
 let next = 0;
 await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
  while (next < items.length) {
   const i = next++;
   results[i] = cancelled() ? skipped(items[i], i) : await fn(items[i], i);
  }
 }));
 return results;
}
