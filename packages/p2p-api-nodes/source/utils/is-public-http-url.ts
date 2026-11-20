import { IpAddress } from "@mainsail/utils";
import ipaddr from "ipaddr.js";

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

	return ipaddr.isValid(hostname) ? IpAddress.isPublicIp(hostname) : true;
};
