import { Exceptions } from "@mainsail/contracts";

export function normalizeUrl(urlString: string) {
	try {
		const url = new URL(urlString);

		url.hostname = url.hostname.toLowerCase();

		// Default to HTTPS
		if (url.protocol === "") {
			url.protocol = "https:";
		}

		// Normalize the "www." prefix
		url.hostname = url.hostname.replace(/^(www\.)/, "");
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
