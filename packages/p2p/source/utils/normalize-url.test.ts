import { describe } from "@mainsail/test-runner";
import { constants } from "../constants";
import { normalizeUrl } from "./normalize-url";

describe<{}>("normalizeUrl", ({ assert, each, it }) => {
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

	it("should accept a url that is exactly MAX_API_NODE_URL_LENGTH long once normalized", () => {
		const prefix = "http://1.2.3.4/";
		const url = `${prefix}${"a".repeat(constants.MAX_API_NODE_URL_LENGTH - prefix.length)}`;

		assert.equal(normalizeUrl(url), url);
		assert.equal(normalizeUrl(url).length, constants.MAX_API_NODE_URL_LENGTH);
	});

	it("should reject a url that is one character over MAX_API_NODE_URL_LENGTH once normalized", () => {
		const prefix = "http://1.2.3.4/";
		const url = `${prefix}${"a".repeat(constants.MAX_API_NODE_URL_LENGTH - prefix.length + 1)}`;

		assert.throws(() => normalizeUrl(url), `Invalid API Node url: ${url}`);
	});

	// Percent-encoding turns every CJK character into 9; a raw url within the limit grows ~9x.
	it("should reject a url within the limit whose percent-encoded form exceeds it", () => {
		const prefix = "http://1.2.3.4/";
		const url = `${prefix}${"\u4E2D".repeat(constants.MAX_API_NODE_URL_LENGTH - prefix.length)}`;

		assert.equal(url.length, constants.MAX_API_NODE_URL_LENGTH);
		assert.true(new URL(url).toString().length > constants.MAX_API_NODE_URL_LENGTH);
		assert.throws(() => normalizeUrl(url), `Invalid API Node url: ${url}`);
	});

	it("should reject a unicode hostname whose punycode form exceeds the limit", () => {
		const labels = Array.from({ length: 40 }, () => "\u4E2D".repeat(50)).join(".");
		const url = `http://${labels}/`;

		assert.true(url.length < constants.MAX_API_NODE_URL_LENGTH);
		assert.throws(() => normalizeUrl(url), `Invalid API Node url: ${url}`);
	});

	// The limit bounds what is stored and re-advertised, so the stripped parts do not count.
	it("should accept a url over the limit whose normalized form is within it", () => {
		const url = `http://user:pw@1.2.3.4/api?${"q".repeat(constants.MAX_API_NODE_URL_LENGTH)}#${"f".repeat(100)}`;

		assert.true(url.length > constants.MAX_API_NODE_URL_LENGTH);
		assert.equal(normalizeUrl(url), "http://1.2.3.4/api");
	});
});
