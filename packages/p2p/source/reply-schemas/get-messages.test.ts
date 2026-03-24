import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { Contracts } from "@mainsail/contracts";
import { headers } from "../../test/fixtures/responses/headers";
import { prepareValidatorContext } from "../../test/helpers/prepare-validator-context";
import { getMessages } from "./get-messages";
import { Identifiers } from "@mainsail/constants/distribution/identifiers";

type Context = {
	app: Application;
	validator: Contracts.Crypto.Validator;
};

describe<Context>("GetMessages Schema", ({ it, assert, beforeEach, each }) => {
	let data;

	beforeEach(async (context) => {
		data = {
			headers,
			precommits: [],
			prevotes: [],
		};

		context.app = new Application();
		await prepareValidatorContext(context);
		context.validator = context.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator);
	});

	it("should pass validation", ({ validator }) => {
		let result = validator.validate(getMessages, data);
		assert.undefined(result.error);

		result = validator.validate(getMessages, {
			...data,
			precommits: [Buffer.from("a")],
			prevotes: [Buffer.from("b")],
		});

		assert.undefined(result.error);
	});

	it("should not pass if precommits is not buffer", ({ validator }) => {
		const result = validator.validate(getMessages, {
			...data,
			precommits: [1],
		});

		assert.defined(result.error);
	});

	it("should not pass if precommits.len > roundValidators", ({ validator }) => {
		const result = validator.validate(getMessages, {
			...data,
			precommits: Array.from({ length: 55 }).fill(Buffer.from("a")),
		});

		assert.defined(result.error);
	});

	it("should not pass if prevotes is not buffer", ({ validator }) => {
		const result = validator.validate(getMessages, {
			...data,
			prevotes: [1],
		});

		assert.defined(result.error);
	});

	it("should not pass if prevotes.len > roundValidators", ({ validator }) => {
		const result = validator.validate(getMessages, {
			...data,
			prevotes: Array.from({ length: 55 }).fill(Buffer.from("b")),
		});

		assert.defined(result.error);
	});

	each(
		"should not pass if required property is not defined",
		({ context, dataset }) => {
			delete data[dataset];
			const result = context.validator.validate(getMessages, data);

			assert.defined(result.error);
		},
		["precommits", "prevotes", "headers"],
	);
});
