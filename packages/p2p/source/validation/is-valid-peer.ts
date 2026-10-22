import ipaddr from "ipaddr.js";
import os from "os";

export const isPublicIp = (ip: string): boolean => {
	try {
		return ipaddr.process(ip).range() === "unicast";
	} catch {
		return false;
	}
};

export const isPublicHttpUrl = (urlString: string): boolean => {
	let url: URL;
	try {
		url = new URL(urlString);
	} catch {
		return false;
	}

	if (url.protocol !== "http:" && url.protocol !== "https:") {
		return false;
	}

	// URL.hostname wraps an IPv6 literal in brackets ("[::1]"); ipaddr.js wants it bare.
	const hostname = url.hostname.replace(/^\[|]$/g, "");

	if (hostname === "" || hostname === "localhost" || hostname.endsWith(".localhost")) {
		return false;
	}

	return ipaddr.isValid(hostname) ? isPublicIp(hostname) : true;
};

export const sanitizeRemoteAddress = (ip: string): string | undefined => {
	try {
		return ipaddr.process(ip).toString();
	} catch {
		return undefined;
	}
};
export const isLocalHost = (ip: string, includeNetworkInterfaces = true): boolean => {
	try {
		if (ip.startsWith("0") || ["127.0.0.1", "::ffff:127.0.0.1", "::1"].includes(ip)) {
			return true;
		}

		if (includeNetworkInterfaces) {
			const interfaces = os.networkInterfaces();

			return Object.keys(interfaces).some((ifname) => interfaces[ifname]!.some((iface) => iface.address === ip));
		}
	} catch {}

	return false;
};

export const isValidPeerIp = (ip: string, includeNetworkInterfaces = true): boolean => {
	const sanitizedAddress: string | undefined = sanitizeRemoteAddress(ip);

	if (!sanitizedAddress) {
		return false;
	}

	if (isLocalHost(sanitizedAddress, includeNetworkInterfaces)) {
		return false;
	}

	return true;
};
