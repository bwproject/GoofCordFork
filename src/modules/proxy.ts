// Enables HTTP, HTTPS and SOCKS4/5 proxy support through Electron.
import { session } from "electron";
import { createProxyFromUrl, type ProxyHandle } from "electron-viasocks";
import pc from "picocolors";

import { getConfig } from "../stores/config/config.main.ts";

let authenticatedSocksBridge: ProxyHandle | undefined;

export async function initProxy() {
	if (!getConfig("proxy")) return;

	const proxyRules = getConfig("proxyRules").trim();
	if (!proxyRules) {
		console.warn(pc.yellow("[Proxy]"), "Proxy is enabled, but no proxy rules were configured.");
		return;
	}

	let electronProxyRules = proxyRules;
	try {
		const parsed = new URL(proxyRules);
		const isSocks = ["socks4:", "socks5:", "socks5h:"].includes(parsed.protocol);
		const hasCredentials = Boolean(parsed.username || parsed.password);

		// Chromium/Electron does not authenticate SOCKS proxies from proxyRules.
		// Bridge authenticated SOCKS through a loopback HTTP proxy instead.
		if (isSocks && hasCredentials) {
			await authenticatedSocksBridge?.close();
			authenticatedSocksBridge = await createProxyFromUrl(proxyRules);
			electronProxyRules = authenticatedSocksBridge.url;
		} else if (authenticatedSocksBridge) {
			await authenticatedSocksBridge.close();
			authenticatedSocksBridge = undefined;
		}
	} catch (error) {
		console.error(pc.red("[Proxy]"), "Invalid proxy URL or failed to initialize authenticated SOCKS proxy:", error);
		throw error;
	}

	await session.defaultSession.setProxy({
		proxyRules: electronProxyRules,
		proxyBypassRules: getConfig("proxyBypassRules"),
	});

	const protocol = proxyRules.match(/^(https?|socks[45h]):\/\//i)?.[1]?.toUpperCase() ?? "DEFAULT";
	const safeProxy = proxyRules.replace(/\/\/[^/@]+:[^/@]*@/, "//[credentials]@");
	console.log(pc.red("[Proxy]"), `Proxy initialized (${protocol}): ${safeProxy}`);
}
