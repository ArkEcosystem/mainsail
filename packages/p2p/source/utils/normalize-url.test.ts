import { describe, Sandbox } from "../../../test-framework/source";
import { normalizeUrl } from "./normalize-url";

describe<{
	sandbox: Sandbox;
}>("normalizeUrl", ({ assert, each }) => {
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
			{ given: "https://example.com:4003/", normalized: "https://example.com:4003/" },
			{ given: "https://example.com:4003/path", normalized: "https://example.com:4003/path" },
		],
	);

	each(
		"should be invalid ",
		({ dataset: url }) => {
			assert.throws(() => normalizeUrl(url), `Invalid API Node url: ${url}`);
		},
		["localhost", "://localhost", "", "-", 1, "localhost.com"],
	);
});
