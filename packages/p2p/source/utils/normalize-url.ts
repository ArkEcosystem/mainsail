import { Exceptions } from "@mainsail/contracts";

export function normalizeUrl(urlString: string) {
	try {
		const url = new URL(urlString);

		// Trim search parameters
		url.search = "";

		// Remove trailing slash for non-root paths
		if (url.pathname !== "/") {
			url.pathname = url.pathname.replace(/\/$/, "");
		}

		return url.toString();
	} catch {
		throw new Exceptions.InvalidApiNodeUrlError(urlString);
	}
}
