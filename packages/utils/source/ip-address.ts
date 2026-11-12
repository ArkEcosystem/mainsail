import ipaddr from "ipaddr.js";
import os from "os";

export const isValidAddress = (ip: string): boolean => ipaddr.isValid(cleanAddress(ip));

export const isIPv6Address = (ip: string): boolean => {
	try {
		return ipaddr.parse(cleanAddress(ip)).kind() === "ipv6";
	} catch {}

	return false;
};

export const normalizeAddress = (ip: string): string => {
	ip = cleanAddress(ip);

	if (isIPv6Address(ip)) {
		return `[${ip}]`;
	}

	return ip;
};

export const cleanAddress = (ip: string): string => ip.replace("[", "").replace("]", "");

export const isPublicIp = (ip: string): boolean => {
	try {
		return ipaddr.process(ip).range() === "unicast";
	} catch {
		return false;
	}
};

// Canonical form of a remote address: IPv4-mapped IPv6 ("::ffff:1.2.3.4") becomes plain IPv4.
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
			return Object.keys(interfaces).some(
				(ifname) => interfaces[ifname]?.some((iface) => iface.address === ip) ?? false,
			);
		}
	} catch {}

	return false;
};

export const isValidPeerIp = (ip: string, includeNetworkInterfaces = true): boolean => {
	const sanitizedAddress = sanitizeRemoteAddress(ip);
	if (!sanitizedAddress) {
		return false;
	}

	return !isLocalHost(sanitizedAddress, includeNetworkInterfaces);
};
