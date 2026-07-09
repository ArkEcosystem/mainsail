import { Identifiers } from "@mainsail/constants";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";
import { ServiceProvider as CryptoConfigServiceProvider } from "@mainsail/crypto-config";
import type { Contracts } from "@mainsail/contracts";

import cryptoJson from "../../core/bin/config/devnet/core/crypto.json";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { makeKeywords } from "./keywords";

describe<{
	app: Application;
	validator: Contracts.Crypto.Validator;
}>("Keywords", ({ it, beforeEach, assert }) => {
	beforeEach(async (context) => {
		context.app = new Application();
		context.app.get<Contracts.Kernel.Repository>(Identifiers.Config.Repository).set("crypto", cryptoJson);
		await context.app.resolve(ValidationServiceProvider).register();
		await context.app.resolve(CryptoConfigServiceProvider).register();
		context.validator = context.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator);

		context.app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration).setHeight(1);

		const keywords = makeKeywords(
			context.app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration),
		);
		for (const keyword of Object.values(keywords)) {
			context.validator.addKeyword(keyword);
		}
	});

	it("keyword bigInt should be ok if only one possible value is allowed", (context) => {
		const schema = {
			$id: "test",
			bigInt: { maximum: 100, minimum: 100 },
		};
		context.validator.addSchema(schema);

		assert.undefined(context.validator.validate("test", 100n).error);

		assert.defined(context.validator.validate("test", 100).error);
		assert.defined(context.validator.validate("test", "100").error);
		assert.defined(context.validator.validate("test", 99n).error);
		assert.defined(context.validator.validate("test", 101n).error);
		assert.defined(context.validator.validate("test", null).error);
		assert.defined(context.validator.validate("test", undefined).error);
		assert.defined(context.validator.validate("test", {}).error);
	});

	it("keyword bigInt should be ok if above or equal minimum", (context) => {
		const schema = {
			$id: "test",
			bigInt: { minimum: 20 },
		};
		context.validator.addSchema(schema);

		assert.undefined(context.validator.validate("test", 25n).error);
		assert.undefined(context.validator.validate("test", 20n).error);

		assert.defined(context.validator.validate("test", 19n).error);
	});

	it("keyword bigInt should be ok if below or equal maximum", (context) => {
		const schema = {
			$id: "test",
			bigInt: { maximum: 20 },
		};
		context.validator.addSchema(schema);

		assert.undefined(context.validator.validate("test", 19n).error);
		assert.undefined(context.validator.validate("test", 20n).error);
		assert.undefined(context.validator.validate("test", 0n).error);

		assert.defined(context.validator.validate("test", -1n).error);
		assert.defined(context.validator.validate("test", 21n).error);
	});

	it("keyword bigInt should not be ok for values bigger than the absolute maximum", (context) => {
		const schema = {
			$id: "test",
			bigInt: {},
		};
		context.validator.addSchema(schema);

		const UINT256_MAX = (1n << 256n) - 1n;

		assert.undefined(context.validator.validate("test", BigInt(Number.MAX_SAFE_INTEGER)).error);
		assert.undefined(context.validator.validate("test", BigInt("9223372036854775808")).error);
		assert.undefined(context.validator.validate("test", BigInt(UINT256_MAX)).error);

		assert.defined(context.validator.validate("test", BigInt(UINT256_MAX) + 1n).error);
	});

	it("keyword bigInt should reject a schema with misspelled properties", (context) => {
		const schema = {
			$id: "test",
			bigInt: { minimun: 20 },
		};
		context.validator.addSchema(schema);

		// The schema itself is invalid, so validation errors for any data —
		// including values the misspelled constraint was meant to allow or reject.
		const { error } = context.validator.validate("test", 25n);
		assert.defined(error);
		assert.true(error?.includes("must NOT have additional properties"));

		assert.defined(context.validator.validate("test", 19n).error);
	});

	it("keyword buffer should be ok", (context) => {
		const schema = {
			$id: "test",
			buffer: {},
		};
		context.validator.addSchema(schema);

		assert.undefined(context.validator.validate("test", Buffer.from("")).error);
		assert.undefined(context.validator.validate("test", Buffer.from("abc")).error);
		assert.undefined(context.validator.validate("test", Buffer.alloc(0)).error);
		assert.undefined(context.validator.validate("test", Buffer.alloc(10)).error);
	});

	it("keyword buffer should not be ok", (context) => {
		const schema = {
			$id: "test",
			buffer: {},
		};
		context.validator.addSchema(schema);

		assert.defined(context.validator.validate("test", 1).error);
		assert.defined(context.validator.validate("test", "abc").error);
		assert.defined(context.validator.validate("test").error);
		assert.defined(context.validator.validate("test", null).error);
		assert.defined(context.validator.validate("test", {}).error);
	});

	it("keyword limitToRoundValidators - should be ok", (context) => {
		const schema = {
			$id: "test",
			limitToRoundValidators: {},
		};
		context.validator.addSchema(schema);

		const { roundValidators } = context.app
			.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration)
			.getMilestone(1);

		// Valid cases
		let matrix = new Array(roundValidators).fill(true);
		assert.undefined(context.validator.validate("test", matrix).error);

		matrix = new Array(roundValidators).fill(false);
		assert.undefined(context.validator.validate("test", matrix).error);

		// We don't check for boolean values, that should be defined at schema level
		matrix = new Array(roundValidators).fill(1);
		assert.undefined(context.validator.validate("test", matrix).error);

		matrix = new Array(roundValidators).fill("a");
		assert.undefined(context.validator.validate("test", matrix).error);

		// Invalid cases
		matrix = new Array(roundValidators - 1).fill(false);
		assert.defined(context.validator.validate("test", matrix).error);

		assert.defined(context.validator.validate("test", {}).error);
		assert.defined(context.validator.validate("test", undefined).error);
		assert.defined(context.validator.validate("test", null).error);
		assert.defined(context.validator.validate("test", "12134354").error);
		assert.defined(context.validator.validate("test", []).error);
		assert.defined(context.validator.validate("test", 1).error);
	});

	it("keyword limitToRoundValidators - should be ok with minimum", (context) => {
		const schema = {
			$id: "test",
			limitToRoundValidators: {
				minimum: 0,
			},
		};
		context.validator.addSchema(schema);

		const { roundValidators } = context.app
			.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration)
			.getMilestone(1);

		for (const minimum of [0, 1, roundValidators - 1, roundValidators]) {
			let matrix = new Array(minimum).fill(true);
			assert.undefined(context.validator.validate("test", matrix).error);
		}

		let matrix = new Array(roundValidators + 1).fill(true);
		assert.defined(context.validator.validate("test", matrix).error);
	});

	it("keyword limitToRoundValidators - should reject a schema with misspelled properties", (context) => {
		const schema = {
			$id: "test",
			limitToRoundValidators: { minimun: 0 },
		};
		context.validator.addSchema(schema);

		const { roundValidators } = context.app
			.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration)
			.getMilestone(1);

		// Even a matrix that satisfies the intended constraint errors out,
		// because the misspelled property invalidates the schema itself.
		const { error } = context.validator.validate("test", new Array(roundValidators).fill(true));
		assert.defined(error);
		assert.true(error?.includes("must NOT have additional properties"));

		assert.defined(context.validator.validate("test", []).error);
	});

	it("keyword isValidatorIndex - should reject a schema with misspelled properties", (context) => {
		const schema = {
			$id: "test",
			isValidatorIndex: { blockNumberPat: "x" },
		};
		context.validator.addSchema(schema);

		const { error } = context.validator.validate("test", 0);
		assert.defined(error);
		assert.true(error?.includes("must NOT have additional properties"));
	});

	it("keyword isValidatorIndex - should be ok", (context) => {
		const schema = {
			$id: "test",
			isValidatorIndex: {},
		};
		context.validator.addSchema(schema);

		const { roundValidators } = context.app
			.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration)
			.getMilestone(1);

		for (let index = 0; index < roundValidators; index++) {
			assert.undefined(context.validator.validate("test", index).error);
		}

		assert.defined(context.validator.validate("test", -1).error);
		assert.defined(context.validator.validate("test", 50.000_01).error);
		assert.defined(context.validator.validate("test", roundValidators).error);
		assert.defined(context.validator.validate("test", roundValidators + 1).error);
		assert.defined(context.validator.validate("test", "a").error);
		assert.defined(context.validator.validate("test", undefined).error);
	});

	it("keyword limitToRoundValidators - should reject when below an explicit non-zero minimum", (context) => {
		const schema = {
			$id: "test",
			limitToRoundValidators: {
				minimum: 5,
			},
		};
		context.validator.addSchema(schema);

		// length 4 < explicit minimum 5 -> rejected (lower-bound branch with a non-zero minimum)
		assert.defined(context.validator.validate("test", new Array(4).fill(true)).error);
		// length 5 == minimum -> ok
		assert.undefined(context.validator.validate("test", new Array(5).fill(true)).error);
	});

	it("keyword limitToRoundValidators - should reject above roundValidators with a minimum present", (context) => {
		const schema = {
			$id: "test",
			limitToRoundValidators: {
				minimum: 1,
			},
		};
		context.validator.addSchema(schema);

		const { roundValidators } = context.app
			.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration)
			.getMilestone(1);

		// within [minimum, roundValidators] -> ok
		assert.undefined(context.validator.validate("test", new Array(roundValidators).fill(true)).error);
		// length > roundValidators -> rejected (upper-bound branch, minimum present)
		assert.defined(context.validator.validate("test", new Array(roundValidators + 1).fill(true)).error);
	});
});

describe<{
	app: Application;
	validator: Contracts.Crypto.Validator;
}>("Keywords - milestone boundary", ({ it, beforeEach, assert }) => {
	beforeEach(async (context) => {
		context.app = new Application();
		await context.app.resolve(ValidationServiceProvider).register();
		context.validator = context.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator);

		// Stub milestones so roundValidators depends on the block number: 4 from height 100, otherwise 53.
		// This proves the keyword resolves roundValidators from the block number found at `blockNumberPath`,
		// not from the node's current height (which is the fallback when no path resolves).
		const configuration = {
			getMilestone: (height?: number) => ({
				roundValidators: height !== undefined && height >= 100 ? 4 : 53,
			}),
		} as unknown as Contracts.Crypto.Configuration;

		for (const keyword of Object.values(makeKeywords(configuration))) {
			context.validator.addKeyword(keyword);
		}
	});

	it("keyword isValidatorIndex - resolves roundValidators from the block number at blockNumberPath", (context) => {
		context.validator.addSchema({
			$id: "test",
			properties: {
				blockNumber: { type: "integer" },
				validatorIndex: { isValidatorIndex: { blockNumberPath: "blockNumber" } },
			},
			type: "object",
		});

		// height 100 -> 4 validators: index 3 valid, index 4 rejected
		assert.undefined(context.validator.validate("test", { blockNumber: 100, validatorIndex: 3 }).error);
		assert.defined(context.validator.validate("test", { blockNumber: 100, validatorIndex: 4 }).error);

		// index 4 is accepted when the path resolves to a height with 53 validators, so the resolved
		// boundary height - not the current-height fallback - drives the result
		assert.undefined(context.validator.validate("test", { blockNumber: 1, validatorIndex: 4 }).error);
	});

	it("keyword limitToRoundValidators - resolves roundValidators from the block number at blockNumberPath", (context) => {
		context.validator.addSchema({
			$id: "test",
			properties: {
				blockNumber: { type: "integer" },
				validators: {
					items: { type: "boolean" },
					limitToRoundValidators: { blockNumberPath: "blockNumber" },
					type: "array",
				},
			},
			type: "object",
		});

		// height 100 -> 4 validators: exactly 4 valid, 5 and 53 rejected
		assert.undefined(
			context.validator.validate("test", { blockNumber: 100, validators: new Array(4).fill(true) }).error,
		);
		assert.defined(
			context.validator.validate("test", { blockNumber: 100, validators: new Array(5).fill(true) }).error,
		);
		assert.defined(
			context.validator.validate("test", { blockNumber: 100, validators: new Array(53).fill(true) }).error,
		);

		// height 1 -> 53 validators: an array of 53 is accepted, proving the path (not the fallback) is used
		assert.undefined(
			context.validator.validate("test", { blockNumber: 1, validators: new Array(53).fill(true) }).error,
		);
	});
});
