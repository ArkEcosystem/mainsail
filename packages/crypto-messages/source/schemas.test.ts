import { Identifiers } from "@mainsail/constants";
import { schemas as blockSchemas } from "@mainsail/crypto-block";
import { Configuration } from "@mainsail/crypto-config";
import { schemas as consensusSchemas } from "@mainsail/crypto-consensus-bls12-381";
import { makeKeywords as makeBaseKeywords, schemas as baseSchemas } from "@mainsail/crypto-validation";
import { Validator } from "@mainsail/validation/source/validator";

import cryptoJson from "../../core/bin/config/devnet/core/crypto.json";
import { describe, Sandbox } from "../../test-framework/source";
import { prevoteData, prevoteDataNoBlock } from "../test/fixtures/index.js";
import { makeKeywords as makeProposalKeywords } from "@mainsail/crypto-proposal/source/keywords.js";
import { schemas } from "./schemas";

describe<{
	sandbox: Sandbox;
	validator: Validator;
}>("Schemas", ({ it, assert, beforeEach }) => {
	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
		context.sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration).setConfig(cryptoJson);

		context.validator = context.sandbox.app.resolve(Validator);

		for (const keyword of Object.values({
			...makeBaseKeywords(context.sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration)),
			...makeProposalKeywords(context.sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration)),
		})) {
			context.validator.addKeyword(keyword);
		}

		for (const schema of Object.values({
			...baseSchemas,
			...blockSchemas,
			...consensusSchemas,
			...schemas,
		})) {
			context.validator.addSchema(schema);
		}
	});

	it("message - should be ok", async ({ validator }) => {
		const result = validator.validate("message", prevoteData);
		assert.undefined(result.error);
	});

	it("message - should be ok without block", async ({ validator }) => {
		const result = validator.validate("message", prevoteDataNoBlock);
		assert.undefined(result.error);
	});
});
