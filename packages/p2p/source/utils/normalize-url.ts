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

	// Trim search parameters and the fragment
	url.search = "";
	url.hash = "";

	// Remove trailing slash for non-root paths
	if (url.pathname !== "/") {
		url.pathname = url.pathname.replace(/\/$/, "");
	}

	return url.toString();
}
