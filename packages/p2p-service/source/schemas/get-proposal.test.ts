import type { Validator } from "@mainsail/validation";

import { describe } from "@mainsail/test-runner";

import { headers, makeValidator, requestError } from "../../test/helpers/schemas";

describe<{
	validator: Validator;
}>("getProposal schema", ({ it, assert, beforeEach }) => {
	const query = { blockNumber: 5, round: 0 };

	beforeEach((context) => {
		context.validator = makeValidator();
	});

	it("request - should accept what the codec hands over", ({ validator }) => {
		assert.undefined(requestError(validator, "getProposal", { headers, query }));
	});

	it("request - should not accept a request without the header", ({ validator }) => {
		assert.string(requestError(validator, "getProposal", { query }));
	});

	it("request - should not accept a request without the query", ({ validator }) => {
		assert.string(requestError(validator, "getProposal", { headers }));
	});

	it("request - should not accept a query without a block number", ({ validator }) => {
		assert.string(requestError(validator, "getProposal", { headers, query: { blockNumber: 0, round: 0 } }));
	});
});
