import { describe } from "@mainsail/test-runner";
import { RateLimiter } from "../rate-limiter";
import { buildRateLimiter } from "./build-rate-limiter";

describe("buildRateLimiter", ({ it, assert }) => {
	it("should return instance of RateLimiter", () => {
		const rateLimiter = buildRateLimiter({ remoteAccess: [], whitelist: [], rateLimit: 1, roundValidators: 5 });

		assert.instance(rateLimiter, RateLimiter);
	});
});
