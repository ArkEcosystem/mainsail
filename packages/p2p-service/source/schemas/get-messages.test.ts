import type { Validator } from "@mainsail/validation";

import { describe } from "@mainsail/test-runner";

import { bitmap, headers, makeValidator, requestError, responseError, VALIDATORS } from "../../test/helpers/schemas";

describe<{
	validator: Validator;
}>("getMessages schema", ({ it, assert, beforeEach, each }) => {
	const query = { blockNumber: 5, round: 0, validatorsSignedPrecommit: bitmap(), validatorsSignedPrevote: bitmap() };

	beforeEach((context) => {
		context.validator = makeValidator();
	});

	it("request - should accept what the codec hands over", ({ validator }) => {
		assert.undefined(requestError(validator, "getMessages", { headers, query }));
	});

	it("request - should not accept a request without the header", ({ validator }) => {
		assert.string(requestError(validator, "getMessages", { query }));
	});

	it("request - should not accept a request without the query", ({ validator }) => {
		assert.string(requestError(validator, "getMessages", { headers }));
	});

	each(
		"request - should not accept a query with",
		({ dataset: [, change], context }) => {
			assert.string(requestError(context.validator, "getMessages", { headers, query: { ...query, ...change } }));
		},
		[
			["no block number", { blockNumber: 0 }],
			["more prevotes than the round has validators", { validatorsSignedPrevote: bitmap(VALIDATORS + 1) }],
			["more precommits than the round has validators", { validatorsSignedPrecommit: bitmap(VALIDATORS + 1) }],
		] as [string, Record<string, unknown>][],
	);

	const votes = (count: number) => Array.from({ length: count }, () => Buffer.from("vote"));

	it("response - should accept what the codec hands over", ({ validator }) => {
		assert.undefined(
			responseError(validator, "getMessages", { headers, precommits: votes(1), prevotes: votes(VALIDATORS) }),
		);
	});

	it("response - should accept a response without votes", ({ validator }) => {
		assert.undefined(responseError(validator, "getMessages", { headers, precommits: [], prevotes: [] }));
	});

	it("response - should not accept a response without the header", ({ validator }) => {
		assert.string(responseError(validator, "getMessages", { precommits: [], prevotes: [] }));
	});

	it("response - should not accept more votes of a kind than the round has validators", ({ validator }) => {
		assert.string(
			responseError(validator, "getMessages", { headers, precommits: [], prevotes: votes(VALIDATORS + 1) }),
		);
		assert.string(
			responseError(validator, "getMessages", { headers, precommits: votes(VALIDATORS + 1), prevotes: [] }),
		);
	});
});
