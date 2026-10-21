import { InvalidApiNodeUrlError } from "@mainsail/exceptions";

import { constants } from "../constants.js";

export function normalizeUrl(urlString: string): string {
	let url: URL;
	try {
		url = new URL(urlString);
	} catch {
		throw new InvalidApiNodeUrlError(urlString);
	}

	if (url.protocol !== "http:" && url.protocol !== "https:") {
		throw new InvalidApiNodeUrlError(urlString);
	}

	const hostname = url.hostname.replace(/\.+$/, "");
	if (hostname === "") {
		throw new InvalidApiNodeUrlError(urlString);
	}
	url.hostname = hostname;

	// Trim credentials, search parameters and the fragment
	url.username = "";
	url.password = "";
	url.search = "";
	url.hash = "";

	// Remove trailing slash for non-root paths
	if (url.pathname !== "/") {
		url.pathname = url.pathname.replace(/\/$/, "");
	}

	const normalized = url.toString();

	if (normalized.length > constants.MAX_API_NODE_URL_LENGTH) {
		throw new InvalidApiNodeUrlError(urlString);
	}

	return normalized;
}
