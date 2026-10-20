import { describe } from "@mainsail/test-runner";
import { normalizeUrl } from "./normalize-url";

describe<{}>("normalizeUrl", ({ assert, each }) => {
	each(
		"normalizeUrl",
		({ dataset: { given, normalized } }) => {
			assert.equal(normalizeUrl(given), normalized);
		},
		[
			{ given: "http://localhost:4003", normalized: "http://localhost:4003/" },
			{ given: "http://localhost:4003/", normalized: "http://localhost:4003/" },
			{ given: "http://example", normalized: "http://example/" },
			{ given: "http://example.com", normalized: "http://example.com/" },
			{ given: "http://example.com/", normalized: "http://example.com/" },
			{ given: "http://example.com/path/", normalized: "http://example.com/path" },
			{ given: "http://example.com/path?123534", normalized: "http://example.com/path" },
			{ given: "http://example.com/path#section", normalized: "http://example.com/path" },
			{ given: "http://example.com/#section", normalized: "http://example.com/" },
			{ given: "http://user:pw@example.com/path", normalized: "http://example.com/path" },
			{ given: "http://user@example.com/", normalized: "http://example.com/" },
			{ given: "https://example.com:4003/", normalized: "https://example.com:4003/" },
			{ given: "https://example.com:4003/path", normalized: "https://example.com:4003/path" },
			// host canonicalisation: case, default port and trailing dot collapse into one key
			{ given: "http://Example.COM/path", normalized: "http://example.com/path" },
			{ given: "http://example.com:80/", normalized: "http://example.com/" },
			{ given: "https://example.com:443/", normalized: "https://example.com/" },
			{ given: "http://example.com:443/", normalized: "http://example.com:443/" },
			{ given: "http://1.2.3.4:80/", normalized: "http://1.2.3.4/" },
			{ given: "http://example.com./", normalized: "http://example.com/" },
			{ given: "http://example.com../path", normalized: "http://example.com/path" },
			{ given: "http://h.example.:4003/", normalized: "http://h.example:4003/" },
			{ given: "http://[2606:4700::1111]:80/", normalized: "http://[2606:4700::1111]/" },
		],
	);

	each(
		"should be invalid ",
		({ dataset: url }) => {
			assert.throws(() => normalizeUrl(url), `Invalid API Node url: ${url}`);
		},
		[
			"localhost",
			"://localhost",
			"",
			"-",
			1,
			"localhost.com",
			"ftp://example.com/",
			"ws://example.com/",
			"file:///etc/passwd",
			"http://./",
			"http://../",
		],
	);
});
