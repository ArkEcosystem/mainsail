import * as constants from "./constants";
import { describe } from "@arkecosystem/core-test-framework";

describe("Constants", ({ it, assert }) => {
	it("satoshi is valid", () => {
		assert.defined(constants.SATOSHI);
		assert.equal(constants.SATOSHI, 100000000);
	});
});
