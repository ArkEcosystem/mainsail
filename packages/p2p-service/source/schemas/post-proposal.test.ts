import type { Validator } from "@mainsail/validation";

import { describe } from "@mainsail/test-runner";

import { headers, makeValidator, requestError } from "../../test/helpers/schemas";

describe<{
	validator: Validator;
}>("postProposal schema", ({ it, assert, beforeEach }) => {
	const proposal = Buffer.from("proposal");

	beforeEach((context) => {
		context.validator = makeValidator();
	});

	it("request - should accept what the codec hands over", ({ validator }) => {
		assert.undefined(requestError(validator, "postProposal", { headers, proposal }));
	});

	it("request - should not accept a request without the header", ({ validator }) => {
		assert.string(requestError(validator, "postProposal", { proposal }));
	});
});
