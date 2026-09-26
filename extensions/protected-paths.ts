/**
 * Protected Paths Extension — adapted for Tim's setup (24 Aug 2026)
 *
 * Blocks direct writes to .env/.git paths and obvious mutations involving the exact
 * shared COMP3888 repos/ tree. Other folders named repos or node_modules are not
 * globally protected. This is defence in depth, not a sandbox: OS file permissions
 * are still required for a hard security boundary.
 *
 * EDIT THE LIST BELOW to change what is protected.
 */

import { resolve } from "node:path";
import {
	isToolCallEventType,
	type ExtensionAPI,
} from "@earendil-works/pi-coding-agent";

const COMP3888_ROOT = "c:/users/tim/documents/university of sydney/comp3888";
const PROTECTED_REPOS_ROOT = `${COMP3888_ROOT}/repos`;

function normalisePath(cwd: string, candidate: string): string {
	const withoutAt = candidate.startsWith("@") ? candidate.slice(1) : candidate;
	return resolve(cwd, withoutAt).replaceAll("\\", "/").toLowerCase();
}

function isWithinRoot(cwd: string, candidate: string, root: string): boolean {
	const absolute = normalisePath(cwd, candidate);
	return absolute === root || absolute.startsWith(`${root}/`);
}

function pathParts(cwd: string, candidate: string): string[] {
	return normalisePath(cwd, candidate).split("/").filter(Boolean);
}

function isProtectedPath(cwd: string, candidate: string): boolean {
	if (isWithinRoot(cwd, candidate, PROTECTED_REPOS_ROOT)) return true;
	const parts = pathParts(cwd, candidate);
	return parts.some(
		(part) => part === ".git" || part === ".env" || part.startsWith(".env."),
	);
}

function isInsideRepos(cwd: string): boolean {
	return isWithinRoot(cwd, ".", PROTECTED_REPOS_ROOT);
}

function commandReferencesRepos(cwd: string, command: string): boolean {
	const normalisedCommand = command.replaceAll("\\", "/").toLowerCase();
	if (normalisedCommand.includes(PROTECTED_REPOS_ROOT)) return true;
	const normalisedCwd = normalisePath(cwd, ".");
	const isComp3888Context = normalisedCwd === COMP3888_ROOT ||
		normalisedCwd.startsWith(`${COMP3888_ROOT}/`);
	return isComp3888Context && /(?:^|[\s"'=:/])repos(?:\/|$)/i.test(normalisedCommand);
}

function looksMutating(command: string): boolean {
	const mutatingCommand = /(?:^|[;&|]\s*|\b)(?:rm|mv|cp|mkdir|rmdir|touch|truncate|dd|install|patch|rsync|chmod|chown|tee|set-content|add-content|out-file|remove-item|move-item|copy-item|new-item|rename-item)\b/i;
	const mutatingGit = /\bgit(?:\.exe)?(?:\s+-c\s+\S+|\s+-C\s+\S+)*\s+(?:add|commit|reset|checkout|switch|restore|clean|merge|rebase|cherry-pick|revert|apply|am|stash|tag|branch|push|pull|fetch)\b/i;
	const inPlaceEdit = /\bsed\b[^\r\n;&|]*\s-i(?:\s|$)/i;
	const findDelete = /\bfind\b[^\r\n;&|]*\s-delete(?:\s|[;&|]|$)/i;
	return mutatingCommand.test(command) || mutatingGit.test(command) || inPlaceEdit.test(command) || findDelete.test(command);
}

function redirectsIntoProtectedPath(cwd: string, command: string): boolean {
	const redirects = command.matchAll(/(?:^|[^<])>{1,2}\s*(?:"([^"]+)"|'([^']+)'|([^\s;&|]+))/g);
	for (const match of redirects) {
		const target = match[1] ?? match[2] ?? match[3];
		if (target && isProtectedPath(cwd, target)) return true;
	}
	return false;
}

export default function (pi: ExtensionAPI) {
	pi.on("tool_call", async (event, ctx) => {
		if (isToolCallEventType("write", event) || isToolCallEventType("edit", event)) {
			const candidate = event.input.path;
			if (typeof candidate !== "string" || !isProtectedPath(ctx.cwd, candidate)) return;

			if (ctx.hasUI) {
				ctx.ui.notify("Blocked a write to a protected path.", "warning");
			}
			return {
				block: true,
				reason: `Path "${candidate}" is protected. Use a non-protected working copy.`,
			};
		}

		if (isToolCallEventType("bash", event) || isToolCallEventType("powershell", event)) {
			const command = event.input.command;
			if (typeof command !== "string") return;
			const directMutation = looksMutating(command) &&
				(isInsideRepos(ctx.cwd) || commandReferencesRepos(ctx.cwd, command));
			if (!directMutation && !redirectsIntoProtectedPath(ctx.cwd, command)) return;

			if (ctx.hasUI) {
				ctx.ui.notify("Blocked a shell mutation involving the protected repos folder.", "warning");
			}
			return {
				block: true,
				reason: "The command may modify the protected repos/ tree. Use a non-protected working copy.",
			};
		}

		return undefined;
	});
}
