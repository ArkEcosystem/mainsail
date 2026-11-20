import type { Validator } from "@mainsail/validation";

import { describe } from "@mainsail/test-runner";

import { bitmap, headers, makeValidator, requestError, VALIDATORS } from "../../test/helpers/schemas";

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
});
