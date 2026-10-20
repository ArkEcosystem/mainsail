import { InvalidApiNodeUrlError } from "@mainsail/exceptions";

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

	return url.toString();
}
