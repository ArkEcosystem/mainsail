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

	it("should return the first x-forwarded-for entry when trustProxy is true", () => {
		const request = makeRequest({ "x-forwarded-for": "9.9.9.9, 8.8.8.8" });

		assert.is(getIp(request, true), "9.9.9.9");
	});

	it("should join array x-forwarded-for values and take the first", () => {
		const request = makeRequest({ "x-forwarded-for": ["a", "b"] });

		assert.is(getIp(request, true), "a");
	});

	it("should fall back to remoteAddress when x-forwarded-for header is missing", () => {
		const request = makeRequest({});

		assert.is(getIp(request, true), "1.2.3.4");
	});

	it("should trim leading and trailing spaces from the forwarded entry", () => {
		const request = makeRequest({ "x-forwarded-for": "   7.7.7.7   , 8.8.8.8" });

		assert.is(getIp(request, true), "7.7.7.7");
	});
});
