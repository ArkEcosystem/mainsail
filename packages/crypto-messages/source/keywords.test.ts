import { Contracts, Identifiers } from "@mainsail/contracts";
import { Configuration } from "@mainsail/crypto-config";
import { Validator } from "@mainsail/validation/source/validator";

import cryptoJson from "../../core/bin/config/testnet/crypto.json";
import { describe, Sandbox } from "../../test-framework";
import { makeKeywords } from "./keywords";

describe<{
	sandbox: Sandbox;
	validator: Validator;
}>("Keywords", ({ it, beforeEach, assert }) => {
	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.validator = context.sandbox.app.resolve(Validator);

		context.sandbox.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
		context.sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration).setConfig(cryptoJson);

		const keywords = makeKeywords(context.sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration));
		context.validator.addKeyword(keywords.limitToActiveValidators);
		context.validator.addKeyword(keywords.isValidatorIndex);
	});

	it("keyword limitToActiveValidators - should be ok", (context) => {
		const schema = {
			$id: "test",
			limitToActiveValidators: {},
		};
		context.validator.addSchema(schema);

		const { activeValidators } = context.sandbox.app
			.get<Contracts.Crypto.IConfiguration>(Identifiers.Cryptography.Configuration)
			.getMilestone();

		let matrix = new Array(activeValidators).fill(true);
		assert.undefined(context.validator.validate("test", matrix).error);

		matrix = new Array(activeValidators).fill(false);
		assert.undefined(context.validator.validate("test", matrix).error);

		matrix = new Array(activeValidators).fill(1);
		assert.undefined(context.validator.validate("test", matrix).error);

		matrix = new Array(activeValidators - 1).fill(false);
		assert.defined(context.validator.validate("test", matrix).error);

		assert.defined(context.validator.validate("test", {}).error);
		assert.defined(context.validator.validate("test").error);
		assert.defined(context.validator.validate("test", null).error);
		assert.defined(context.validator.validate("test", "12134354").error);
		assert.defined(context.validator.validate("test", []).error);
		assert.defined(context.validator.validate("test", 1).error);
	});

	it("keyword limitToActiveValidators - should be ok with minimum", (context) => {
		const schema = {
			$id: "test",
			limitToActiveValidators: {
				minimum: 0,
			},
		};
		context.validator.addSchema(schema);

		const { activeValidators } = context.sandbox.app
			.get<Contracts.Crypto.IConfiguration>(Identifiers.Cryptography.Configuration)
			.getMilestone();

		let matrix = new Array(activeValidators).fill(true);
		assert.undefined(context.validator.validate("test", matrix).error);

		matrix = new Array(activeValidators + 1).fill(true);
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

		const { activeValidators } = context.sandbox.app
			.get<Contracts.Crypto.IConfiguration>(Identifiers.Cryptography.Configuration)
			.getMilestone();

		for (let index = 0; index < activeValidators; index++) {
			assert.undefined(context.validator.validate("test", index).error);
		}

		assert.defined(context.validator.validate("test", 50.000_01).error);
		assert.defined(context.validator.validate("test", activeValidators).error);
		assert.defined(context.validator.validate("test", activeValidators + 1).error);
		assert.defined(context.validator.validate("test", "a").error);
		assert.defined(context.validator.validate("test").error);
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
			}
		};
		context.validator.addSchema(schema);

		const { activeValidators } = context.sandbox.app
			.get<Contracts.Crypto.IConfiguration>(Identifiers.Cryptography.Configuration)
			.getMilestone();

		for (let index = 0; index < activeValidators; index++) {
			assert.undefined(context.validator.validate("test", { height: 1, validatorIndex: index }).error);
		}

		assert.defined(context.validator.validate("test", { height: 1, validatorIndex: activeValidators }).error);
	});

	it("keyword isValidatorIndex - should be ok for parent block", (context) => {
		const schema = {
			$id: "test",
			type: "object",
			properties: {
				block: {
					type: "object",
					properties: {
						serialized: {
							type: "string",
						}
					}
				},
				validatorIndex: { isValidatorIndex: {} },
			}
		};
		context.validator.addSchema(schema);

		let { activeValidators } = context.sandbox.app
			.get<Contracts.Crypto.IConfiguration>(Identifiers.Cryptography.Configuration)
			.getMilestone();

		const block1 = {
			// height=2
			serialized: "000173452bb48901020000000000000000000000000000000",
		}

		for (let index = 0; index < activeValidators; index++) {
			assert.undefined(context.validator.validate("test", { block: block1, validatorIndex: index }).error);
		}

		assert.defined(context.validator.validate("test", { block: block1, validatorIndex: activeValidators }).error);

		// change milestone to 15 validators at height 15
		context.sandbox.app
			.get<Contracts.Crypto.IConfiguration>(Identifiers.Cryptography.Configuration)
			.getMilestones()[1].height = 15;

		context.sandbox.app
			.get<Contracts.Crypto.IConfiguration>(Identifiers.Cryptography.Configuration)
			.getMilestones()[1].activeValidators = 15;

		const block2 = {
			// height=15
			serialized: "000173452bb489010f0000000000000000000000000000000",
		}

		for (let index = 0; index < 15; index++) {
			assert.undefined(context.validator.validate("test", { block: block2, validatorIndex: index }).error);
		}

		assert.defined(context.validator.validate("test", { block: block2, validatorIndex: 15 }).error);

		// block 1 still acepted
		for (let index = 0; index < activeValidators; index++) {
			assert.undefined(context.validator.validate("test", { block: block1, validatorIndex: index }).error);
		}

		assert.defined(context.validator.validate("test", { block: block1, validatorIndex: 53 }).error);
	});
});
