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

		const keywords = makeKeywords();
		for (const keyword of Object.values(keywords)) {
			context.validator.addKeyword(keyword);
		}
	});

	it("minVotesUnvotesLength - should be ok", (context) => {
		const schema = {
			$id: "test",
			minVotesUnvotesLength: 1,
			properties: {
				unvotes: {
					maxItems: 1,
					minItems: 0,
					type: "array",
				},
				votes: {
					maxItems: 1,
					minItems: 0,
					type: "array",
				},
			},
			required: ["unvotes", "votes"],
			type: "object",
		};
		context.validator.addSchema(schema);

		assert.undefined(
			context.validator.validate("test", {
				unvotes: ["pk1"],
				votes: [],
			}).error,
		);

		assert.undefined(
			context.validator.validate("test", {
				unvotes: [],
				votes: ["pk2"],
			}).error,
		);

		assert.undefined(
			context.validator.validate("test", {
				unvotes: ["pk1"],
				votes: ["pk2"],
			}).error,
		);

		assert.defined(
			context.validator.validate("test", {
				unvotes: [],
				votes: [],
			}).error,
		);
	});
});
