import { describe } from "@mainsail/test-runner";
import { validatorSetPack, validatorSetUnpack } from "./validator-set-pack";

describe("validatorSet", async ({ assert, it }) => {
	it("should pack it", () => {
		const validatorSet = [true, true, false, false];
		assert.equal(validatorSetPack(validatorSet), 3n);
	});

	it("should unpack it", () => {
		assert.equal(validatorSetUnpack(3n, 4), [true, true, false, false]);
	});

	it("should pack and unpack", () => {
		const validatorSet = [true, true, false, false];
		const packed = validatorSetPack(validatorSet);
		const unpacked = validatorSetUnpack(packed, validatorSet.length);

		assert.equal(unpacked, validatorSet);
	});

	it("should pack and unpack empty", () => {
		const validatorSet: boolean[] = [];
		const packed = validatorSetPack(validatorSet);
		const unpacked = validatorSetUnpack(packed, validatorSet.length);

		assert.equal(unpacked, validatorSet);
	});

	it("should reject invalid packed validator set", () => {
		const validatorSet = [true, true, true, true];
		const packed = validatorSetPack(validatorSet);

		assert.throws(() => validatorSetUnpack(0n, -1), "`numberOfValidators` must be a non-negative integer");
		assert.throws(() => validatorSetUnpack(0n, -10), "`numberOfValidators` must be a non-negative integer");
		assert.throws(() => validatorSetUnpack(0n, 1.1), "`numberOfValidators` must be a non-negative integer");
		assert.throws(() => validatorSetUnpack(0n, -0.1), "`numberOfValidators` must be a non-negative integer");
		assert.throws(() => validatorSetUnpack(0n, 0.2), "`numberOfValidators` must be a non-negative integer");
		assert.throws(
			() => validatorSetUnpack(0n, "4" as unknown as number),
			"`numberOfValidators` must be a non-negative integer",
		);
		assert.throws(() => validatorSetUnpack(packed, 3), "`packed` contains set bits beyond `numberOfValidators`");
		assert.throws(() => validatorSetUnpack(-1n, 3), "`packed` must be non-negative");
	});
});
