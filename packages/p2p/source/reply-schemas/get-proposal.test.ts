import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { Contracts } from "@mainsail/contracts";
import { headers } from "../../test/fixtures/responses/headers";
import { prepareValidatorContext } from "../../test/helpers/prepare-validator-context";
import { getProposal } from "./get-proposal";
import { Identifiers } from "@mainsail/constants";

type Context = {
	app: Application;
	validator: Contracts.Crypto.Validator;
};

describe<Context>("GetProposal Schema", ({ it, assert, beforeEach, each }) => {
	let data;

	beforeEach(async (context) => {
		data = {
			headers,
			proposal: Buffer.alloc(0),
		};

		context.app = new Application();
		await prepareValidatorContext(context);
		context.validator = context.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator);
	});

	it("should pass validation", ({ validator }) => {
		const result = validator.validate(getProposal, data);
		assert.undefined(result.error);
	});

	it("should not pass if proposal is not buffer", ({ validator }) => {
		const result = validator.validate(getProposal, {
			...data,
			proposal: 1,
		});

		assert.defined(result.error);
	});

	each(
		"should not pass if required property is not defined",
		({ context, dataset }) => {
			delete data[dataset];
			const result = context.validator.validate(getProposal, data);

			assert.defined(result.error);
		},
		["proposal", "headers"],
	);
});
