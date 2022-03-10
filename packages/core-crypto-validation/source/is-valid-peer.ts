import * as ipAdd from "ipaddr.js";
import os from "os";

// @TODO review the implementation of all methods
export const isLocalHost = (ip: string, includeNetworkInterfaces = true): boolean => {
	try {
		const parsed = ipAdd.parse(ip);
		if (parsed.range() === "loopback" || ip.startsWith("0") || ["127.0.0.1", "::ffff:127.0.0.1"].includes(ip)) {
			return true;
		}

		if (includeNetworkInterfaces) {
			const interfaces: {
				[index: string]: os.NetworkInterfaceInfo[];
			} = os.networkInterfaces();

			return Object.keys(interfaces).some((ifname) => interfaces[ifname].some((iface) => iface.address === ip));
		}

		return false;
	} catch {
		return false;
	}
};

const sanitizeRemoteAddress = (ip: string): string | undefined => {
	try {
		return ipAdd.process(ip).toString();
	} catch {
		return undefined;
	}
};

export const isValidPeer = (
	peer: { ip: string; status?: string | number },
	includeNetworkInterfaces = true,
): boolean => {
	const sanitizedAddress: string | undefined = sanitizeRemoteAddress(peer.ip);

	if (!sanitizedAddress) {
		return false;
	}

	peer.ip = sanitizedAddress;

	if (isLocalHost(peer.ip, includeNetworkInterfaces)) {
		return false;
	}

	return true;
};
