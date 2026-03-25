import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { Contracts } from "@mainsail/contracts";
import { headers } from "../../test/fixtures/responses/headers";
import { prepareValidatorContext } from "../../test/helpers/prepare-validator-context";
import { postProposal } from "./post-proposal";
import { Identifiers } from "@mainsail/constants/distribution/identifiers";

type Context = {
	app: Application;
	validator: Contracts.Crypto.Validator;
};

describe<Context>("PostProposal Schema", ({ it, assert, beforeEach, each }) => {
	const data = {
		headers,
	};

	beforeEach(async (context) => {
		context.app = new Application();
		await prepareValidatorContext(context);
		context.validator = context.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator);
	});

	it("should pass validation", ({ validator }) => {
		const result = validator.validate(postProposal, data);

		assert.undefined(result.error);
	});

	it("should not pass if headers are undefined", ({ validator }) => {
		const result = validator.validate(postProposal, {});

		assert.defined(result.error);
	});
});
