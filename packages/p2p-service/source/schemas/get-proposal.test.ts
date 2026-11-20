import type { Validator } from "@mainsail/validation";

import { describe } from "@mainsail/test-runner";

import { headers, makeValidator, requestError, responseError } from "../../test/helpers/schemas";

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

	it("response - should accept what the codec hands over", ({ validator }) => {
		assert.undefined(responseError(validator, "getProposal", { headers, proposal: Buffer.from("proposal") }));
	});

	it("response - should accept the answer of a peer without the proposal", ({ validator }) => {
		assert.undefined(responseError(validator, "getProposal", { headers }));
	});

	it("response - should not accept a response without the header", ({ validator }) => {
		assert.string(responseError(validator, "getProposal", { proposal: Buffer.from("proposal") }));
	});
});
