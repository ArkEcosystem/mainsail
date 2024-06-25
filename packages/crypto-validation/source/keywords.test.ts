import { Identifiers } from "@mainsail/contracts";
import { Configuration } from "@mainsail/crypto-config";
import { BigNumber } from "@mainsail/utils";
import { Validator } from "@mainsail/validation/source/validator";

import cryptoJson from "../../core/bin/config/testnet/core/crypto.json";
import { describe, Sandbox } from "../../test-framework/source";
import { makeKeywords } from "./keywords";

type Context = {
	validator: Validator;
	sandbox: Sandbox;
};

describe<{
	sandbox: Sandbox;
	validator: Validator;
}>("Keywords", ({ it, beforeEach, assert }) => {
	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
		context.sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration).setConfig(cryptoJson);

		context.validator = context.sandbox.app.resolve(Validator);

		const keywords = makeKeywords(context.sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration));
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
		assert.defined(context.validator.validate("test").error);
		assert.defined(context.validator.validate("test", 123).error);
	});

	it("keyword maxBytes - minimum bytes should be 0", (context) => {
		const schema = {
			$id: "test",
			maxBytes: -1,
			type: "string",
		};
		context.validator.addSchema(schema);

		assert.true(context.validator.validate("test", "1234").error.includes("data must be >= 0"));
	});

	it("keyword bignumber should be ok if only one possible value is allowed", (context) => {
		const schema = {
			$id: "test",
			bignumber: { maximum: 100, minimum: 100 },
		};
		context.validator.addSchema(schema);

		assert.undefined(context.validator.validate("test", 100).error);

		assert.defined(context.validator.validate("test", 99).error);
		assert.defined(context.validator.validate("test", 101).error);
		assert.defined(context.validator.validate("test", null).error);
		assert.defined(context.validator.validate("test").error);
		assert.defined(context.validator.validate("test", {}).error);
	});

	it("keyword bignumber should be ok if above or equal minimum", (context) => {
		const schema = {
			$id: "test",
			bignumber: { minimum: 20 },
		};
		context.validator.addSchema(schema);

		assert.undefined(context.validator.validate("test", 25).error);
		assert.undefined(context.validator.validate("test", 20).error);

		assert.defined(context.validator.validate("test", 19).error);
	});

	it("keyword bignumber should be ok if below or equal maximum", (context) => {
		const schema = {
			$id: "test",
			bignumber: { maximum: 20 },
		};
		context.validator.addSchema(schema);

		assert.undefined(context.validator.validate("test", 19).error);
		assert.undefined(context.validator.validate("test", 20).error);
		assert.undefined(context.validator.validate("test", 0).error);

		assert.defined(context.validator.validate("test", -1).error);
		assert.defined(context.validator.validate("test", 21).error);
	});

	it("keyword bignumber should not be ok for values bigger than the absolute maximum", (context) => {
		const schema = {
			$id: "test",
			bignumber: {},
		};
		context.validator.addSchema(schema);

		assert.undefined(context.validator.validate("test", Number.MAX_SAFE_INTEGER).error);

		assert.defined(context.validator.validate("test", 9_223_372_036_854_775_808).error);
	});

	it("keyword bignumber should be ok for number, string and bignumber as input", (context) => {
		const schema = {
			$id: "test",
			bignumber: { maximum: 2000, minimum: 100, type: "number" },
		};
		context.validator.addSchema(schema);

		for (const value of [100, 1e2, 1020, 500, 2000]) {
			assert.undefined(context.validator.validate("test", value).error);
			assert.undefined(context.validator.validate("test", value.toString()).error);
			assert.undefined(context.validator.validate("test", BigNumber.make(value)).error);
		}

		for (const value of [1e8, 1999.000_001, 1 / 1e8, -100, -500, -2000.1]) {
			assert.defined(context.validator.validate("test", value).error);
			assert.defined(context.validator.validate("test", value.toString()).error);
			let pass = true;
			try {
				BigNumber.make(value);
			} catch {
				pass = false;
			}

			if (pass) {
				assert.defined(context.validator.validate("test", BigNumber.make(value)).error);
			}
		}
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

		const object: any = { id: "test", amount: "12" };
		assert.false(object.amount instanceof BigNumber);
		assert.undefined(context.validator.validate("test", object).error);
		assert.false(object.amount instanceof BigNumber);
		assert.equal(object.amount, "12");
	});

	it("keyword transactionGasLimit should be ok", (context) => {
		const schema = {
			$id: "test",
			transactionGasLimit: {},
		};
		context.validator.addSchema(schema);

		assert.undefined(context.validator.validate("test", cryptoJson.milestones[0].gas!.minimumGasLimit).error);
		assert.undefined(context.validator.validate("test", cryptoJson.milestones[0].gas!.maximumGasLimit).error);

		assert.defined(context.validator.validate("test", 1).error);
		assert.defined(context.validator.validate("test", 0).error);
		assert.defined(context.validator.validate("test", -1).error);
		assert.defined(context.validator.validate("test", Number.MAX_SAFE_INTEGER).error);
		assert.defined(context.validator.validate("test", "asdf").error);
	});

	it("keyword bytecode should be ok", (context) => {
		const schema = {
			$id: "test",
			bytecode: {},
		};
		context.validator.addSchema(schema);

		assert.undefined(context.validator.validate("test", "").error);
		assert.undefined(context.validator.validate("test", "0x00").error);
		assert.undefined(context.validator.validate("test", "0x").error);
		assert.undefined(context.validator.validate("test", "00").error);

		const maxBytecodeLength = cryptoJson.milestones[0].gas!.maximumGasLimit / 2;
		const maxPayload = "0x" + "a".repeat(maxBytecodeLength);
		assert.undefined(context.validator.validate("test", maxPayload).error);

		assert.defined(context.validator.validate("test", maxPayload + "aa").error);

		assert.defined(context.validator.validate("test", 1).error);
		assert.defined(context.validator.validate("test", 0).error);
		assert.defined(context.validator.validate("test", -1).error);
		assert.defined(context.validator.validate("test", Number.MAX_SAFE_INTEGER).error);
		assert.defined(context.validator.validate("test", "asdf").error);
	});

	it("keyword bytecode should remove 0x prefix", (context) => {
		const schema = {
			$id: "test",
			type: "object",
			properties: {
				payload: { bytecode: {} },
			},
		};

		context.validator.addSchema(schema);

		const withPrefix = {
			payload: "0xdead",
		};

		assert.undefined(context.validator.validate("test", withPrefix).error);
		assert.equal(withPrefix.payload, "dead");

		const withoutPrefix = {
			payload: "dead",
		};

		assert.undefined(context.validator.validate("test", withoutPrefix).error);
		assert.equal(withoutPrefix.payload, "dead");
	});
});
