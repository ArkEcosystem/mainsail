import { Identifiers } from "@mainsail/contracts";
import { Configuration } from "@mainsail/crypto-config";
import { schemas as baseSchemas, makeKeywords as makeBaseKeywords } from "@mainsail/crypto-validation";
import { schemas as blockSchemas } from "@mainsail/crypto-block";
import { schemas as consensusSchemas } from "@mainsail/crypto-consensus-bls12-381";
import { Validator } from "@mainsail/validation/source/validator";

import cryptoJson from "../../core/bin/config/testnet/crypto.json";
import { describe, Sandbox } from "../../test-framework";
import { schemas } from "./schemas";
import { makeKeywords as makeMessageKeywords } from "./keywords";
import {
	precommitData,
	precommitDataNoBlock,
	prevoteData,
	prevoteDataNoBlock,
	proposalData,
} from "../test/fixtures/proposal";

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
			...makeMessageKeywords(context.sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration)),
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

	it("proposal - should be ok", ({ validator }) => {
		const result = validator.validate("proposal", proposalData);
		assert.undefined(result.error);
	});

	it("prevote - should be ok", async ({ validator }) => {
		const result = validator.validate("prevote", prevoteData);
		assert.undefined(result.error);
	});

	it("prevote - should be ok without block", async ({ validator }) => {
		const result = validator.validate("prevote", prevoteDataNoBlock);
		assert.undefined(result.error);
	});

	it("precommit - should be ok", async ({ validator }) => {
		const result = validator.validate("precommit", precommitData);
		assert.undefined(result.error);
	});

	it("precommit - should be ok without block", async ({ validator }) => {
		const result = validator.validate("precommit", precommitDataNoBlock);
		assert.undefined(result.error);
	});
});
