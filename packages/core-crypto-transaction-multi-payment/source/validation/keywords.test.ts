import { Identifiers } from "@arkecosystem/core-contracts";
import { Configuration } from "@arkecosystem/core-crypto-config";
import { Validator } from "@arkecosystem/core-validation/source/validator";

import cryptoJson from "../../../core/bin/config/testnet/crypto.json";
import { describe, Sandbox } from "../../../core-test-framework";
import { makeKeywords } from "./keywords";

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

	it("maxMultiPaymentLimit - should be ok from config", (context) => {
		const schema = {
			$id: "test",
			maxMultiPaymentLimit: {},
			type: "array",
		};
		context.validator.addSchema(schema);

		context.sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration).setConfig({
			...cryptoJson,
			milestones: [
				{
					height: 1,
					multiPaymentLimit: 10,
				},
			],
		});

		assert.undefined(context.validator.validate("test", new Array(0).fill(1)).error);
		assert.undefined(context.validator.validate("test", new Array(9).fill(1)).error);
		assert.undefined(context.validator.validate("test", new Array(10).fill(1)).error);

		assert.defined(context.validator.validate("test", new Array(11).fill(1)).error);
	});

	it("maxMultiPaymentLimit - should be 256 if multiPaymentLimit is not defined", (context) => {
		const schema = {
			$id: "test",
			maxMultiPaymentLimit: {},
			type: "array",
		};
		context.validator.addSchema(schema);

		context.sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration).setConfig({
			...cryptoJson,
			milestones: [
				{
					height: 1,
				},
			],
		});

		assert.undefined(context.validator.validate("test", new Array(256).fill(1)).error);

		assert.defined(context.validator.validate("test", new Array(257).fill(1)).error);
	});
});
