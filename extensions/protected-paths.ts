/**
 * Protected Paths Extension — adapted for Tim's setup (24 Aug 2026)
 *
 * Blocks write/edit operations to protected paths. Hard rule source:
 * Comp3888/CLAUDE.md — repos/ holds three clones of the shared marked team
 * repo and must never be modified without Tim explicitly saying so.
 *
 * EDIT THE LIST BELOW to change what is protected.
 *
 * Honest limitations: this guards the write/edit tools and obvious
 * destructive bash commands naming the path. It cannot catch everything
 * (e.g. a script that writes there indirectly, or git push run from inside
 * the repo). Defence in depth, not an absolute wall.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
	const protectedPaths = [
		"repos/",       // shared team repo clones — hard rule
		".env",
		".git/",
		"node_modules/",
	];

	// bash tokens that mean "this command modifies something"
	const destructiveTokens = ["rm ", "mv ", "cp ", "tee ", "sed -i", "touch ", "truncate ", "dd ", " -delete"];
	// redirects INTO repos/ only (e.g. `echo x > repos/tim/f`) — a bare `2>/dev/null` is harmless
	const redirectIntoRepos = /\S*>\s*\S*repos\//;

	function isProtected(path: string): boolean {
		return protectedPaths.some((p) => path.includes(p));
	}

	pi.on("tool_call", async (event, ctx) => {
		if (event.toolName === "write" || event.toolName === "edit") {
			const path = event.input.path as string;
			if (isProtected(path)) {
				if (ctx.hasUI) {
					ctx.ui.notify(`Blocked write to protected path: ${path}`, "warning");
				}
				return { block: true, reason: `Path "${path}" is protected (repos/ rule — ask Tim)` };
			}
			return undefined;
		}

		if (event.toolName === "bash") {
			const cmd = event.input.command as string;
			if (!cmd || !cmd.includes("repos/")) return undefined;
			if (destructiveTokens.some((t) => cmd.includes(t)) || redirectIntoRepos.test(cmd)) {
				if (ctx.hasUI) {
					ctx.ui.notify(`Blocked destructive bash command on repos/: ${cmd.slice(0, 80)}`, "warning");
				}
				return { block: true, reason: `Command touches repos/ with a modifying token — repos/ is read-only unless Tim says otherwise` };
			}
			return undefined;
		}

		return undefined;
	});
}
