import ipaddr from "ipaddr.js";
import os from "os";

const sanitizeRemoteAddress = (ip: string): string | undefined => {
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

	if (isLocalHost(ip, includeNetworkInterfaces)) {
		return false;
	}

	return true;
};
