import { Identifiers } from "@mainsail/constants";
import { Configuration } from "@mainsail/crypto-config";
import { BigNumber } from "@mainsail/utils";
import { Validator } from "@mainsail/validation/source/validator";
import type { Contracts } from "@mainsail/contracts";

import cryptoJson from "../../core/bin/config/devnet/core/crypto.json";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { makeKeywords } from "./keywords";

describe<{
	app: Application;
	validator: Validator;
}>("Keywords", ({ it, beforeEach, assert }) => {
	beforeEach((context) => {
		context.app = new Application();

		context.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
		context.app.get<Configuration>(Identifiers.Cryptography.Configuration).setConfig(cryptoJson);
		context.app.get<Configuration>(Identifiers.Cryptography.Configuration).setHeight(1);

		context.validator = context.app.resolve(Validator);

		const keywords = makeKeywords(context.app.get<Configuration>(Identifiers.Cryptography.Configuration));
		for (const keyword of Object.values(keywords)) {
			context.validator.addKeyword(keyword);
		}
	});

	it("keyword maxBytes should be ok", (context) => {
		const schema = {
			$id: "test",
			maxBytes: 64,
			type: "string",
		};
		context.validator.addSchema(schema);

		assert.undefined(context.validator.validate("test", "1234").error);
		assert.undefined(context.validator.validate("test", "a".repeat(64)).error);
		assert.undefined(context.validator.validate("test", "⊁".repeat(21)).error);

		assert.defined(context.validator.validate("test", "a".repeat(65)).error);
		assert.defined(context.validator.validate("test", "⊁".repeat(22)).error);
		assert.defined(context.validator.validate("test", {}).error);
		assert.defined(context.validator.validate("test", null).error);
		assert.defined(context.validator.validate("test", undefined).error);
		assert.defined(context.validator.validate("test", 123).error);
	});

	it("keyword maxBytes - minimum bytes should be 0", (context) => {
		const schema = {
			$id: "test",
			maxBytes: -1,
			type: "string",
		};
		context.validator.addSchema(schema);

		assert.true(context.validator.validate("test", "1234").error!.includes("data must be >= 0"));
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

	it("keyword bignumber should be ok if only one possible value is allowed", (context) => {
		const schema = {
			$id: "test",
			bignumber: { maximum: 100, minimum: 100 },
		};
		context.validator.addSchema(schema);

		assert.undefined(context.validator.validate("test", BigNumber.make(100)).error);

		assert.defined(context.validator.validate("test", 100).error);
		assert.defined(context.validator.validate("test", "100").error);
		assert.defined(context.validator.validate("test", BigNumber.make(99)).error);
		assert.defined(context.validator.validate("test", BigNumber.make(101)).error);
		assert.defined(context.validator.validate("test", null).error);
		assert.defined(context.validator.validate("test", undefined).error);
		assert.defined(context.validator.validate("test", {}).error);
	});

	it("keyword bignumber should be ok if above or equal minimum", (context) => {
		const schema = {
			$id: "test",
			bignumber: { minimum: 20 },
		};
		context.validator.addSchema(schema);

		assert.undefined(context.validator.validate("test", BigNumber.make(25)).error);
		assert.undefined(context.validator.validate("test", BigNumber.make(20)).error);

		assert.defined(context.validator.validate("test", BigNumber.make(19)).error);
	});

	it("keyword bignumber should be ok if below or equal maximum", (context) => {
		const schema = {
			$id: "test",
			bignumber: { maximum: 20 },
		};
		context.validator.addSchema(schema);

		assert.undefined(context.validator.validate("test", BigNumber.make(19)).error);
		assert.undefined(context.validator.validate("test", BigNumber.make(20)).error);
		assert.undefined(context.validator.validate("test", BigNumber.make(0)).error);

		assert.defined(context.validator.validate("test", BigNumber.make(-1)).error);
		assert.defined(context.validator.validate("test", BigNumber.make(21)).error);
	});

	it("keyword bignumber should not be ok for values bigger than the absolute maximum", (context) => {
		const schema = {
			$id: "test",
			bignumber: {},
		};
		context.validator.addSchema(schema);

		assert.undefined(context.validator.validate("test", BigNumber.make(Number.MAX_SAFE_INTEGER)).error);
		assert.undefined(context.validator.validate("test", BigNumber.make("9223372036854775808")).error);
		assert.undefined(context.validator.validate("test", BigNumber.UINT256_MAX).error);

		assert.defined(context.validator.validate("test", BigNumber.UINT256_MAX.plus(1)).error);
	});

	it("keyword bignumber should not be ok for number and string", (context) => {
		const schema = {
			$id: "test",
			bignumber: { maximum: 2000, minimum: 100, type: "number" },
		};
		context.validator.addSchema(schema);

		assert.defined(context.validator.validate("test", 120).error);
		assert.defined(context.validator.validate("test", "120").error);
	});

	it("keyword bignumber should not accept garbage", (context) => {
		const schema = {
			$id: "test",
			bignumber: {},
		};
		context.validator.addSchema(schema);

		assert.defined(context.validator.validate("test").error);
		assert.defined(context.validator.validate("test", {}).error);
		assert.defined(context.validator.validate("test", /d+/).error);
		assert.defined(context.validator.validate("test", "").error);
		assert.defined(context.validator.validate("test", "\u0000").error);
	});

	it("keyword bignumber should not modify parent", (context) => {
		const schema = {
			$id: "test",
			properties: {
				id: { type: "string" },
				amount: { bignumber: { minimum: 1 } },
			},
			type: "object",
		};
		context.validator.addSchema(schema);

		const object: any = { id: "test", amount: BigNumber.make("12") };
		assert.true(object.amount instanceof BigNumber);
		assert.undefined(context.validator.validate("test", object).error);
		assert.true(object.amount instanceof BigNumber);
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

		let matrix = new Array(roundValidators).fill(true);
		assert.undefined(context.validator.validate("test", matrix).error);

		matrix = new Array(roundValidators).fill(false);
		assert.undefined(context.validator.validate("test", matrix).error);

		matrix = new Array(roundValidators).fill(1);
		assert.undefined(context.validator.validate("test", matrix).error);

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

		let matrix = new Array(roundValidators).fill(true);
		assert.undefined(context.validator.validate("test", matrix).error);

		matrix = new Array(roundValidators + 1).fill(true);
		assert.defined(context.validator.validate("test", matrix).error);

		assert.undefined(context.validator.validate("test", []).error);
		assert.undefined(context.validator.validate("test", [false]).error);
		assert.undefined(context.validator.validate("test", [true]).error);
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

		assert.defined(context.validator.validate("test", 50.000_01).error);
		assert.defined(context.validator.validate("test", roundValidators).error);
		assert.defined(context.validator.validate("test", roundValidators + 1).error);
		assert.defined(context.validator.validate("test", "a").error);
		assert.defined(context.validator.validate("test", undefined).error);
	});

	it("keyword isValidatorIndex - should be ok for parent height", (context) => {
		const schema = {
			$id: "test",
			type: "object",
			properties: {
				height: {
					type: "integer",
				},
				validatorIndex: { isValidatorIndex: {} },
			},
		};
		context.validator.addSchema(schema);

		const { roundValidators } = context.app
			.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration)
			.getMilestone(1);

		for (let index = 0; index < roundValidators; index++) {
			assert.undefined(context.validator.validate("test", { height: 1, validatorIndex: index }).error);
		}

		assert.defined(context.validator.validate("test", { height: 1, validatorIndex: roundValidators }).error);
	});

	it("keyword isValidatorIndex - should be ok for parent block", (context) => {
		const schema = {
			$id: "test",
			type: "object",
			properties: {
				data: {
					type: "object",
					properties: {
						serialized: {
							type: "string",
						},
					},
				},
				validatorIndex: { isValidatorIndex: {} },
			},
		};
		context.validator.addSchema(schema);

		let { roundValidators } = context.app
			.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration)
			.getMilestone(1);

		const block1 = {
			// height=2
			serialized: "000173452bb48901020000000000000000000000000000000",
		};

		for (let index = 0; index < roundValidators; index++) {
			assert.undefined(context.validator.validate("test", { data: block1, validatorIndex: index }).error);
		}

		assert.defined(context.validator.validate("test", { data: block1, validatorIndex: roundValidators }).error);

		// change milestone to 15 validators at height 15
		context.app
			.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration)
			.getMilestones()[2].height = 15;

		context.app
			.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration)
			.getMilestones()[2].roundValidators = 15;

		const block2 = {
			// height=15
			serialized: "000173452bb489010f0000000000000000000000000000000",
		};

		for (let index = 0; index < 15; index++) {
			assert.undefined(context.validator.validate("test", { data: block2, validatorIndex: index }).error);
		}

		assert.defined(context.validator.validate("test", { data: block2, validatorIndex: 15 }).error);

		// block 1 still accepted
		for (let index = 0; index < roundValidators; index++) {
			assert.undefined(context.validator.validate("test", { data: block1, validatorIndex: index }).error);
		}

		assert.defined(context.validator.validate("test", { data: block1, validatorIndex: 53 }).error);
	});
});
