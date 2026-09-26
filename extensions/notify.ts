/**
 * Pi Notify Extension
 *
 * Sends an early native terminal notification when an agent run ends.
 * Supports multiple terminal protocols:
 * - OSC 777: Ghostty, iTerm2, WezTerm, rxvt-unicode
 * - OSC 99: Kitty
 * - Windows toast: Windows Terminal
 */

import { execFile } from "node:child_process";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

function escapePowerShellSingleQuoted(value: string): string {
	return value.replaceAll("'", "''");
}

function sanitiseOSC(value: string): string {
	return value.replace(/[\x00-\x1f\x7f;]/g, " ");
}

function windowsToastScript(title: string, body: string): string {
	const type = "Windows.UI.Notifications";
	const mgr = `[${type}.ToastNotificationManager, ${type}, ContentType = WindowsRuntime]`;
	const template = `[${type}.ToastTemplateType]::ToastText01`;
	const toast = `[${type}.ToastNotification]::new($xml)`;
	const safeTitle = escapePowerShellSingleQuoted(title);
	const safeBody = escapePowerShellSingleQuoted(body);
	return [
		`${mgr} > $null`,
		`$xml = [${type}.ToastNotificationManager]::GetTemplateContent(${template})`,
		`$xml.GetElementsByTagName('text')[0].AppendChild($xml.CreateTextNode('${safeBody}')) > $null`,
		`[${type}.ToastNotificationManager]::CreateToastNotifier('${safeTitle}').Show(${toast})`,
	].join("; ");
}

function notifyOSC777(title: string, body: string): void {
	process.stdout.write(`\x1b]777;notify;${sanitiseOSC(title)};${sanitiseOSC(body)}\x07`);
}

function notifyOSC99(title: string, body: string): void {
	const safeTitle = sanitiseOSC(title);
	const safeBody = sanitiseOSC(body);
	process.stdout.write(`\x1b]99;i=1:d=0;${safeTitle}\x1b\\`);
	process.stdout.write(`\x1b]99;i=1:p=body;${safeBody}\x1b\\`);
}

function notifyWindows(title: string, body: string): void {
	execFile(
		"powershell.exe",
		["-NoProfile", "-NonInteractive", "-Command", windowsToastScript(title, body)],
		{ timeout: 10_000, windowsHide: true },
		() => {
			// Notifications are best-effort. A missing or disabled toast service must not crash Pi.
		},
	);
}

function notify(title: string, body: string): void {
	if (process.env.WT_SESSION) {
		notifyWindows(title, body);
	} else if (process.env.KITTY_WINDOW_ID) {
		notifyOSC99(title, body);
	} else {
		notifyOSC777(title, body);
	}
}

export default function (pi: ExtensionAPI) {
	pi.on("agent_end", async (_event, ctx) => {
		if (ctx.mode !== "tui" || !process.stdout.isTTY) return;
		notify("Pi", "Ready for input");
	});
}
