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
});
