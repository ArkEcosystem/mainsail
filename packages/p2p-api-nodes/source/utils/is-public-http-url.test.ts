import { describe } from "@mainsail/test-runner";

import { isPublicHttpUrl } from "./is-public-http-url";

describe("isPublicHttpUrl", ({ it, assert }) => {
	it("should be ok for a http(s) url with a public host", () => {
		for (const url of [
			"http://1.2.3.4:4003/",
			"https://1.2.3.4/api",
			"http://[2606:4700::1111]:4003/",
			"https://api.example.com/api",
			"http://example",
			"http://node.local/",
			"http://node.internal/",
		]) {
			assert.true(isPublicHttpUrl(url), url);
		}
	});

	it("should not be ok for a non-url, a wrong scheme, localhost or a non-public ip", () => {
		for (const url of [
			"",
			"not a url",
			"1.2.3.4:4003",
			// wrong scheme
			"ftp://1.2.3.4/",
			"ws://1.2.3.4:4003/",
			"file:///etc/passwd",
			"javascript:alert(1)",
			"data:text/plain,hi",
			"mailto:a@b.c",
			// localhost
			"http://localhost:4003/",
			"http://api.localhost/",
			// non-public ip literals
			"http://127.0.0.1:4003/",
			"http://10.0.0.5:4003/",
			"http://172.16.0.1/",
			"http://192.168.1.1/",
			"http://169.254.169.254/latest/meta-data",
			"http://100.64.0.1/",
			"http://0.0.0.0:4003/",
			"http://224.0.0.1/",
			"http://[::1]:4003/",
			"http://[::]/",
			"http://[fe80::1]/",
			"http://[fd00::1]/",
			"http://[::ffff:10.0.0.1]/",
			"http://[2001:db8::1]/",
		]) {
			assert.false(isPublicHttpUrl(url), url);
		}
	});
});
