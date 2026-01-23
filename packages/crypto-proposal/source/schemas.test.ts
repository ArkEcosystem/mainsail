import { Identifiers } from "@mainsail/constants";
import { schemas as blockSchemas } from "@mainsail/crypto-block";
import { Configuration } from "@mainsail/crypto-config";
import { schemas as consensusSchemas } from "@mainsail/crypto-consensus-bls12-381";
import { makeKeywords as makeBaseKeywords, schemas as baseSchemas } from "@mainsail/crypto-validation";
import { Validator } from "@mainsail/validation/source/validator";

import cryptoJson from "../../core/bin/config/devnet/core/crypto.json";
import { Application } from "@mainsail/kernel";
import { Container } from "@mainsail/container";
import { describe } from "@mainsail/test-runner";
import { proposalData } from "../test/fixtures/index.js";
import { makeKeywords as makeMessageKeywords } from "./keywords";
import { schemas } from "./schemas";

describe<{
	app: Application;
	validator: Validator;
}>("Schemas", ({ it, assert, beforeEach }) => {
	beforeEach((context) => {
		context.app = new Application(new Container());

		context.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
		context.app.get<Configuration>(Identifiers.Cryptography.Configuration).setConfig(cryptoJson);

		context.validator = context.app.resolve(Validator);

		for (const keyword of Object.values({
			...makeBaseKeywords(context.app.get<Configuration>(Identifiers.Cryptography.Configuration)),
			...makeMessageKeywords(context.app.get<Configuration>(Identifiers.Cryptography.Configuration)),
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
});
