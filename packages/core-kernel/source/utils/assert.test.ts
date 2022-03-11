import { Blocks, Interfaces, Managers } from "@arkecosystem/crypto";

import { describe, Generators } from "../../../core-test-framework";
import { assert as assertToTest } from "./assert";

describe<{
	block: Interfaces.IBlock;
	config: Interfaces.NetworkConfig;
}>("Assertions", ({ afterEach, assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.config = Managers.configManager.all();

		// todo: completely wrap this into a function to hide the generation and setting of the config?
		Managers.configManager.setConfig(Generators.generateCryptoConfigRaw());

		// Black Magic to get the genesis block to pass
		Managers.configManager.getMilestone().aip11 = false;

		context.block = Blocks.BlockFactory.fromJson(Managers.configManager.get("genesisBlock"));
	});

	afterEach((context) => {
		Managers.configManager.setConfig(context.config);
	});

	it(".array", (context) => {
		assert.rejects(() => assertToTest.array("abc"), 'Expected value which is "array".');
		assert.resolves(() => assertToTest.array([]));
	});

	it(".bigint", (context) => {
		assert.rejects(() => assertToTest.bigint("abc"), 'Expected value which is "bigint".');
		assert.rejects(() => assertToTest.bigint(1), 'Expected value which is "bigint".');
		assert.resolves(() => assertToTest.bigint(BigInt(1)));
	});

	it(".block", (context) => {
		assert.rejects(() => assertToTest.block("abc"), 'Expected value which is "Crypto.Blocks.Block".');
		assert.resolves(() => assertToTest.block(context.block));
	});

	it(".boolean", (context) => {
		assert.rejects(() => assertToTest.boolean("abc"), 'Expected value which is "boolean".');
		assert.resolves(() => assertToTest.boolean(true));
		assert.resolves(() => assertToTest.boolean(false));
	});

	it(".buffer", (context) => {
		assert.rejects(() => assertToTest.buffer("abc"), 'Expected value which is "buffer".');
		assert.resolves(() => assertToTest.buffer(Buffer.alloc(8)));
	});

	it(".defined", (context) => {
		assert.rejects(() => assertToTest.defined(), 'Expected value which is "non-null and non-undefined".');
		assert.rejects(() => assertToTest.defined(null), 'Expected value which is "non-null and non-undefined".');
		assert.resolves(() => assertToTest.defined("abc"));
	});

	it(".number", (context) => {
		assert.rejects(() => assertToTest.number("abc"), 'Expected value which is "number".');
		assert.resolves(() => assertToTest.number(1));
	});

	it(".object", (context) => {
		assert.rejects(() => assertToTest.object("abc"), 'Expected value which is "object".');
		assert.resolves(() => assertToTest.object({}));
	});

	it(".string", (context) => {
		assert.rejects(() => assertToTest.string(1), 'Expected value which is "string".');
		assert.resolves(() => assertToTest.string("abc"));
	});

	it(".symbol", (context) => {
		assert.rejects(() => assertToTest.symbol("abc"), 'Expected value which is "symbol".');
		assert.resolves(() => assertToTest.symbol(Symbol(1)));
	});

	it(".transaction", (context) => {
		assert.rejects(
			() => assertToTest.transaction("abc"),
			'Expected value which is "Crypto.Transactions.Transaction".',
		);
		assert.resolves(() => assertToTest.transaction(context.block.transactions[0]));
	});

	it(".undefined", (context) => {
		assert.rejects(() => assertToTest.undefined("abc"), 'Expected value which is "undefined".');
		assert.resolves(() => assertToTest.undefined());
	});
});
