import { describe } from "@mainsail/test-runner";

import { getIp } from "./get-ip";

const makeRequest = (headers: any, remoteAddress = "1.2.3.4"): any => ({
	headers,
	info: { remoteAddress },
});

describe<{}>("getIp", ({ it, assert }) => {
	it("should return remoteAddress when trustProxy is false regardless of headers", () => {
		const request = makeRequest({ "x-forwarded-for": "9.9.9.9, 8.8.8.8" });

		assert.is(getIp(request, false), "1.2.3.4");
	});

	it("should return the last x-forwarded-for entry when trustProxy is true", () => {
		const request = makeRequest({ "x-forwarded-for": "9.9.9.9, 8.8.8.8" });

		assert.is(getIp(request, true), "8.8.8.8");
	});

	it("should ignore a client-supplied x-forwarded-for entry in front of the proxy's own", () => {
		const request = makeRequest({ "x-forwarded-for": "1.2.3.4, 6.6.6.6" }, "10.0.0.1");

		assert.is(getIp(request, true), "6.6.6.6");
	});

	it("should join array x-forwarded-for values and take the last", () => {
		const request = makeRequest({ "x-forwarded-for": ["a", "b"] });

		assert.is(getIp(request, true), "b");
	});

	it("should fall back to remoteAddress when x-forwarded-for header is missing", () => {
		const request = makeRequest({});

		assert.is(getIp(request, true), "1.2.3.4");
	});

	it("should trim leading and trailing spaces from the forwarded entry", () => {
		const request = makeRequest({ "x-forwarded-for": "8.8.8.8,   7.7.7.7   " });

		assert.is(getIp(request, true), "7.7.7.7");
	});

	it("should map an IPv4-mapped IPv6 remoteAddress to IPv4", () => {
		const request = makeRequest({}, "::ffff:1.2.3.4");

		assert.is(getIp(request, false), "1.2.3.4");
	});

	it("should return an IPv4-compatible IPv6 remoteAddress as is", () => {
		const request = makeRequest({}, "::1.2.3.4");

		assert.is(getIp(request, false), "::1.2.3.4");
	});

	it("should not throw when the remoteAddress is missing", () => {
		const request: any = { headers: {}, info: {} };

		assert.undefined(getIp(request, false));
	});

	it("should return the forwarded entry as is when it is not an IP address", () => {
		const request = makeRequest({ "x-forwarded-for": "unknown" });

		assert.is(getIp(request, true), "unknown");
	});

	it("should compress and lowercase an IPv6 forwarded entry", () => {
		const request = makeRequest({ "x-forwarded-for": "2001:0DB8:0000:0000:0000:0000:0000:0001" });

		assert.is(getIp(request, true), "2001:db8::1");
	});

	it("should map an IPv4-mapped IPv6 forwarded entry to IPv4", () => {
		const request = makeRequest({ "x-forwarded-for": "8.8.8.8, ::ffff:9.9.9.9" });

		assert.is(getIp(request, true), "9.9.9.9");
	});
});
