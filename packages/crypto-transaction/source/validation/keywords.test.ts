import { Identifiers } from "@mainsail/constants";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";
import { ServiceProvider as CryptoConfigServiceProvider } from "@mainsail/crypto-config";

import cryptoJson from "../../../core/bin/config/devnet/core/crypto.json";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { Contracts } from "@mainsail/contracts";
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

		const configuration = context.app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration);
		configuration.setHeight(0);

		const keywords = makeKeywords(configuration);
		context.validator.addKeyword(keywords.network);
		context.validator.addKeyword(keywords.transactionGasLimit);
		context.validator.addKeyword(keywords.transactionGasPrice);
		context.validator.addKeyword(keywords.bytecode);
	});

	it("keyword network should be ok", (context) => {
		const schema = {
			$id: "test",
			network: true,
		};
		context.validator.addSchema(schema);

		assert.undefined(context.validator.validate("test", 10_000).error);

		assert.defined(context.validator.validate("test", 23).error);
		assert.defined(context.validator.validate("test", "a").error);
	});

	it("keyword network - should not be ok if value is false ", (context) => {
		const schema = {
			$id: "test",
			network: false,
		};
		context.validator.addSchema(schema);

		assert.defined(context.validator.validate("test", 30).error);
		assert.defined(context.validator.validate("test", 23).error);
		assert.defined(context.validator.validate("test", "a").error);
	});

	// TODO: Fix later
	it.skip("keyword network - should return true when network is not set in configuration", (context) => {
		context.app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration).set("network", {});

		const schema = {
			$id: "test",
			network: true,
		};
		context.validator.addSchema(schema);

		assert.undefined(context.validator.validate("test", 30).error);
		assert.undefined(context.validator.validate("test", 23).error);
		assert.undefined(context.validator.validate("test", "a").error);
	});

	it("keyword transactionGasPrice should be ok", (context) => {
		const schema = {
			$id: "test",
			transactionGasPrice: {},
		};
		context.validator.addSchema(schema);

		// Accept 0 gasFee for genesis block
		const configuration = context.app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration);
		configuration.setHeight(1); // simulate non-genesis block

		assert.undefined(context.validator.validate("test", cryptoJson.milestones[0].gas!.minimumGasPrice).error);
		assert.undefined(context.validator.validate("test", "5000000000").error);
		assert.undefined(context.validator.validate("test", 10000000000000).error);

		assert.defined(context.validator.validate("test", 1).error);
		assert.defined(context.validator.validate("test", 0).error);
		assert.defined(context.validator.validate("test", -1).error);
		assert.defined(context.validator.validate("test", "5").error);
		assert.defined(context.validator.validate("test", 10001000000000).error);
		assert.defined(context.validator.validate("test", Number.MAX_SAFE_INTEGER).error);
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

		assert.undefined(context.validator.validate("test", "0x00").error);
		assert.undefined(context.validator.validate("test", "0x").error);

		const maxBytecodeLength = cryptoJson.milestones[0].gas!.maximumGasLimit / 16;
		const maxPayload = "0x" + "a".repeat(maxBytecodeLength);
		assert.undefined(context.validator.validate("test", maxPayload).error);

		assert.defined(context.validator.validate("test", maxPayload + "aa").error);

		assert.defined(context.validator.validate("test", "").error);
		assert.defined(context.validator.validate("test", "00").error);
		assert.defined(context.validator.validate("test", 1).error);
		assert.defined(context.validator.validate("test", 0).error);
		assert.defined(context.validator.validate("test", -1).error);
		assert.defined(context.validator.validate("test", Number.MAX_SAFE_INTEGER).error);
		assert.defined(context.validator.validate("test", "asdf").error);
	});
});
