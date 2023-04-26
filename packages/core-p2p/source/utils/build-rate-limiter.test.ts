import { describe } from "../../../core-test-framework";

import { RateLimiter } from "../rate-limiter";
import { buildRateLimiter } from "./build-rate-limiter";

describe("buildRateLimiter", ({ it, assert }) => {
	it("should return instance of RateLimiter", () => {
		const rateLimiter = buildRateLimiter({ remoteAccess: [], whitelist: [] });

		assert.instance(rateLimiter, RateLimiter);
	});
});
