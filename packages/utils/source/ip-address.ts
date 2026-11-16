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
