import { describe } from "@mainsail/test-runner";
import { reverse } from "./reverse";

describe("reverse", async ({ assert, it, nock, loader }) => {
	it("should work with a string", () => {
		assert.is(reverse("abc"), "cba");
	});
});
