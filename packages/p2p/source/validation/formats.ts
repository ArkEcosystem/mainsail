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
			let url: URL;
			try {
				url = new URL(urlString);
			} catch {
				return false;
			}

			if (url.protocol !== "http:" && url.protocol !== "https:") {
				return false;
			}

			const hostname = url.hostname.replace(/^\[|]$/g, "");

			if (hostname === "" || hostname === "localhost" || hostname.endsWith(".localhost")) {
				return false;
			}

			return ipaddr.isValid(hostname) ? isPublicIp(hostname) : true;
		},
	};

	return { publicHttpUrl, validPeer };
};
