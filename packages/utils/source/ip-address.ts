import ipaddr from "ipaddr.js";

const isIPv4Compatible = (ip: string): boolean => ip.startsWith("::") && !ip.includes(":", 2) && ip.includes(".");

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

export const canonicalAddress = (ip: string): string | undefined => {
	try {
		return isIPv4Compatible(ip) ? undefined : ipaddr.process(ip).toString();
	} catch {
		return undefined;
	}
};

// Literal addresses in a whitelist or blacklist are compared as text, so they have to be in the
// same form as the addresses they are matched against. Glob patterns are left as written.
export const canonicalPatterns = (patterns: string[]): string[] =>
	patterns.map((pattern) => canonicalAddress(pattern) ?? pattern);

// One IPv6 client controls at least a /64 and can pick any address in it, so per-client limits are
// keyed by that prefix.
export const subnetAddress = (ip: string): string => {
	try {
		// process() reads an IPv4-mapped address as IPv4, so those do not all end up in ::/64.
		if (ipaddr.process(ip).kind() === "ipv6") {
			const network = ipaddr.IPv6.networkAddressFromCIDR(`${ip}/64`);

			return `${network}/64`;
		}
	} catch {}

	return ip;
};
