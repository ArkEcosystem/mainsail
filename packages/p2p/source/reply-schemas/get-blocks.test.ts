import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { Contracts } from "@mainsail/contracts";
import { headers } from "../../test/fixtures/responses/headers";
import { prepareValidatorContext } from "../../test/helpers/prepare-validator-context";
import { getBlocks } from "./get-blocks";
import { Identifiers } from "@mainsail/constants/distribution/identifiers";

type Context = {
	app: Application;
	validator: Contracts.Crypto.Validator;
};

describe<Context>("GetBlocks Schema", ({ it, assert, beforeEach, each }) => {
	let data;

	beforeEach(async (context) => {
		data = {
			blocks: [Buffer.from("a")],
			headers,
		};

		context.app = new Application();

		context.app = new Application();
		await prepareValidatorContext(context);
		context.validator = context.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator);
	});

	it("should pass validation", ({ validator }) => {
		const result = validator.validate(getBlocks, data);

		assert.undefined(result.error);
	});

	it("should not pass if blocks is not buffer", ({ validator }) => {
		const result = validator.validate(getBlocks, { ...data, blocks: [1] });

		assert.defined(result.error);
	});

	each(
		"should not pass if required property is not defined",
		({ context, dataset }) => {
			delete data[dataset];
			const result = context.validator.validate(getBlocks, data);

			assert.defined(result.error);
		},
		["blocks", "headers"],
	);
});
