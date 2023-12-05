import { Validator } from "@mainsail/validation/source/validator";
import { describe, Sandbox } from "../../../test-framework/distribution";
import { headers } from "../../test/fixtures/responses/headers";
import { getApiNodes } from "./get-api-nodes";
import { prepareValidatorContext } from "../../test/helpers/prepare-validator-context";
import { Contracts } from "@mainsail/contracts";

type Context = {
	sandbox: Sandbox;
	validator: Validator;
};

describe<Context>("GetApiNodes Schema", ({ it, assert, beforeEach, each }) => {
	let data;

	beforeEach((context) => {
		data = {
			headers,
			apiNodes: [{ ip: "127.0.0.1", port: 4003, protocol: Contracts.P2P.PeerProtocol.Http }],
		};

		context.sandbox = new Sandbox();

		context.validator = context.sandbox.app.resolve(Validator);

		prepareValidatorContext(context);
	});

	it("should pass validation", ({ validator }) => {
		const result = validator.validate(getApiNodes, data);

		assert.undefined(result.error);
	});

	each(
		"should not pass if required property is not defined",
		({ context, dataset }) => {
			delete data[dataset];
			const result = context.validator.validate(getApiNodes, data);

			assert.defined(result.error);
		},
		["headers"],
	);
});
