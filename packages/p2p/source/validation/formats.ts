import type { FormatDefinition } from "ajv";

import ipaddr from "ipaddr.js";

import { isPublicIp, isValidPeerIp } from "./is-valid-peer.js";

export const makeFormats = (): {
	publicHttpUrl: FormatDefinition<string>;
	validPeer: FormatDefinition<string>;
} => {
	const validPeer: FormatDefinition<string> = {
		type: "string",
		validate: (ip: string) => {
			try {
				return isValidPeerIp(ip, false);
			} catch {
				return false;
			}
		},
	};

	const publicHttpUrl: FormatDefinition<string> = {
		type: "string",
		validate: (urlString: string) => {
			let hostname: string;
			try {
				// URL.hostname wraps an IPv6 literal in brackets ("[::1]"); ipaddr.js wants it bare.
				hostname = new URL(urlString).hostname.replace(/^\[|]$/g, "");
			} catch {
				return false;
			}

			if (hostname === "localhost" || hostname.endsWith(".localhost")) {
				return false;
			}

			return ipaddr.isValid(hostname) ? isPublicIp(hostname) : true;
		},
	};

	return { publicHttpUrl, validPeer };
};
