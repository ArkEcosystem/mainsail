import { Managers, Utils, Validation } from "../";
import { TransactionType } from "../enums";
import { describe } from "@arkecosystem/core-test-framework";
import Ajv from "ajv";

describe<{
	ajv: Ajv;
}>("Keywords", ({ it, beforeAll, assert }) => {
	beforeAll((context) => {
		context.ajv = Validation.validator.getInstance();
	});

	it("keyword maxBytes should be ok", (context) => {
		const schema = { type: "string", maxBytes: 64 };
		const validate = context.ajv.compile(schema);

		assert.true(validate("1234"));
		assert.true(validate("a".repeat(64)));
		assert.false(validate("a".repeat(65)));
		assert.true(validate("⊁".repeat(21)));
		assert.false(validate("⊁".repeat(22)));
		assert.false(validate({}));
		assert.false(validate(undefined));
	});

	it("keyword network should be ok", (context) => {
		const schema = { network: true };
		const validate = context.ajv.compile(schema);

		assert.true(validate(30));
		assert.false(validate(23));
		assert.false(validate("a"));

		Managers.configManager.setFromPreset("mainnet");

		assert.true(validate(23));
		assert.false(validate(30));

		Managers.configManager.setFromPreset("devnet");

		assert.true(validate(30));
		assert.false(validate(23));
		assert.false(validate({}));
		assert.false(validate(undefined));
	});

	it("keyword transactionType should be ok", (context) => {
		const schema = { transactionType: TransactionType.Transfer };
		const validate = context.ajv.compile(schema);

		assert.true(validate(0));
		assert.false(validate(TransactionType.Vote));
		assert.false(validate(-1));
		assert.false(validate(""));
		assert.false(validate("0"));
		assert.false(validate(undefined));
	});

	it("keyword blockId should be ok", (context) => {
		const schema = { blockId: {} };
		const validate = context.ajv.compile(schema);

		assert.true(validate("1"));
		assert.true(validate("1234"));
		assert.true(validate("15654541800058894516"));
		assert.false(validate("156545418000588945160"));

		assert.true(validate("e3b0c44298fc1c14"));
		assert.false(validate("e3b0c44298fc1c1"));
		assert.false(validate("e3b0c44298fc1c140"));

		assert.true(validate("94c220691e711c39c79d437ce185748a0018940e1a4144293af9d05627d2eb40"));
		assert.false(validate("94c220691e711c39c79d437ce185748a0018940e1a4144293af9d05627d2eb4"));
		assert.false(validate("94c220691e711c39c79d437ce185748a0018940e1a4144293af9d05627d2eb400"));
	});

	it("keyword blockId should not be ok", (context) => {
		const schema = { blockId: { hex: true } };
		const validate = context.ajv.compile(schema);

		assert.false(validate("nein"));
		assert.false(validate({}));
		assert.false(validate(""));
		assert.false(validate(undefined));
		assert.false(validate(1243));
		assert.false(validate(Utils.BigNumber.make(0)));
	});

	it("keyword blockId should be ok (genesis)", (context) => {
		const schema = {
			properties: {
				height: { type: "number" },
				previousBlock: { blockId: { hex: true, allowNullWhenGenesis: true } },
			},
		};

		const validate = context.ajv.compile(schema);

		assert.true(validate({ height: 1, previousBlock: "" }));
		assert.true(validate({ height: 1, previousBlock: undefined }));
		assert.true(validate({ height: 1, previousBlock: 0 }));
		assert.true(validate({ height: 1, previousBlock: "1234" }));

		assert.false(validate({ height: 1, previousBlock: "abc" }));
		assert.false(validate({ height: 1, previousBlock: {} }));

		assert.false(validate({ height: 2, previousBlock: "" }));
		assert.false(validate({ height: 2, previousBlock: 0 }));
	});

	it("keyword bignumber should be ok if only one possible value is allowed", (context) => {
		const schema = { bignumber: { type: "number", minimum: 100, maximum: 100 } };
		const validate = context.ajv.compile(schema);

		assert.true(validate(100));
		assert.false(validate(99));
		assert.false(validate(101));
	});

	it("keyword bignumber should be ok if above or equal minimum", (context) => {
		const schema = { bignumber: { type: "number", minimum: 20 } };
		const validate = context.ajv.compile(schema);

		assert.true(validate(25));
		assert.true(validate(20));
		assert.false(validate(19));
	});

	it("keyword bignumber should be ok if above or equal maximum", (context) => {
		const schema = { bignumber: { type: "number", maximum: 20 } };
		const validate = context.ajv.compile(schema);

		assert.true(validate(20));
		assert.false(validate(Number.MAX_SAFE_INTEGER));
		assert.false(validate(25));
	});

	it("keyword bignumber should not be ok for values bigger than the absolute maximum", (context) => {
		const schema = { bignumber: {} };
		const validate = context.ajv.compile(schema);

		assert.true(validate(Number.MAX_SAFE_INTEGER));
		assert.true(validate("9223372036854775807"));
		assert.false(validate("9223372036854775808"));
	});

	it("keyword bignumber should be ok for number, string and bignumber as input", (context) => {
		const schema = { bignumber: { type: "number", minimum: 100, maximum: 2000 } };
		const validate = context.ajv.compile(schema);

		for (const value of [100, 1e2, 1020.0, 500, 2000]) {
			assert.true(validate(value));
			assert.true(validate(String(value)));
			assert.true(validate(Utils.BigNumber.make(value)));
		}

		for (const value of [1e8, 1999.000001, 1 / 1e8, -100, -500, -2000.1]) {
			assert.false(validate(value));
			assert.false(validate(String(value)));
		}
	});

	it("keyword bignumber should not accept garbage", (context) => {
		const schema = { bignumber: {} };
		const validate = context.ajv.compile(schema);

		assert.false(validate(undefined));
		assert.false(validate({}));
		assert.false(validate(/d+/));
		assert.false(validate(""));
		assert.false(validate("\u0000"));
	});

	it("keyword bignumber should cast number to Bignumber", (context) => {
		const schema = {
			type: "object",
			properties: {
				amount: { bignumber: {} },
			},
		};

		const data = {
			amount: 100,
		};

		const validate = context.ajv.compile(schema);
		assert.true(validate(data));
		assert.instance(data.amount, Utils.BigNumber);
		assert.equal(data.amount, Utils.BigNumber.make(100));
	});

	it("keyword bignumber should cast string to Bignumber", (context) => {
		const schema = {
			type: "object",
			properties: {
				amount: { bignumber: {} },
			},
		};

		const data = {
			amount: "100",
		};

		const validate = context.ajv.compile(schema);
		assert.true(validate(data));
		assert.instance(data.amount, Utils.BigNumber);
		assert.equal(data.amount, Utils.BigNumber.make(100));
	});

	it("keyword bignumber bypassGenesis should be ok", (context) => {
		const schema = {
			type: "object",
			properties: {
				amount: { bignumber: { type: "number", minimum: 100, bypassGenesis: true } },
			},
		};

		const validate = context.ajv.compile(schema);

		assert.true(validate({ amount: 0, id: "3e3817fd0c35bc36674f3874c2953fa3e35877cbcdb44a08bdc6083dbd39d572" }));
		assert.false(validate({ amount: 0, id: "affe17fd0c35bc36674f3874c2953fa3e35877cbcdb44a08bdc6083dbd39d572" }));
		assert.false(validate({ amount: 0 }));
	});
});
