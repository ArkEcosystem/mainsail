import { describe } from "../../test-framework";
import { validatorSetPack, validatorSetUnpack } from "./validator-set-pack";

describe("validatorSet", async ({ assert, it }) => {
	it("should pack it", () => {
		const validatorSet = [true, true, false, false];
		assert.equal(validatorSetPack(validatorSet), 3n);
	});

	it("should unpack it", () => {
		assert.equal(validatorSetUnpack(3n, 4), [true, true, false, false]);
	});
});
