// Enables HTTP, HTTPS and SOCKS5 proxy support through Electron.
import { session } from "electron";
import pc from "picocolors";

import { getConfig } from "../stores/config/config.main.ts";

export async function initProxy() {
	if (!getConfig("proxy")) return;

	const proxyRules = getConfig("proxyRules").trim();
	if (!proxyRules) {
		console.warn(pc.yellow("[Proxy]"), "Proxy is enabled, but no proxy rules were configured.");
		return;
	}

	const config = {
		proxyRules,
		proxyBypassRules: getConfig("proxyBypassRules"),
	};

	await session.defaultSession.setProxy(config);
	const protocol = proxyRules.match(/^(https?|socks[45]):\/\//i)?.[1]?.toUpperCase() ?? "DEFAULT";
	console.log(pc.red("[Proxy]"), `Proxy initialized (${protocol}): ${proxyRules.replace(/\/\/.*@/, "//[credentials]@")}`);
}
