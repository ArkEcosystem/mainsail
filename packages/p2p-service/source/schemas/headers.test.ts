import type { Validator } from "@mainsail/validation";

import { describe } from "@mainsail/test-runner";

import { bitmap, configuration, headers, makeValidator, requestError, VALIDATORS } from "../../test/helpers/schemas";
import { Schemas } from "./index";

// The header is checked as part of a request; getPeers carries nothing else.
describe<{
	validator: Validator;
}>("headers schema", ({ it, assert, beforeEach, each }) => {
	beforeEach((context) => {
		context.validator = makeValidator();
	});

	it("should accept the header the codec hands over", ({ validator }) => {
		assert.undefined(requestError(validator, "getPeers", { headers }));
	});

	it("should accept a header without a proposed block hash", ({ validator }) => {
		const { proposedBlockHash, ...withoutHash } = headers;

		assert.undefined(requestError(validator, "getPeers", { headers: withoutHash }));
	});

	it("should accept a header with empty bitmaps", ({ validator }) => {
		assert.undefined(
			requestError(validator, "getPeers", {
				headers: { ...headers, validatorsSignedPrecommit: [], validatorsSignedPrevote: [] },
			}),
		);
	});

	it("should measure the bitmaps against the milestone of the header's block number", ({ validator }) => {
		// The node's own milestone is the genesis one, with no validators at all.
		assert.equal(configuration.getMilestone().roundValidators, 0);

		assert.undefined(requestError(validator, "getPeers", { headers }));
	});

	// The decoder drops what the protocol does not define, so such data cannot come through the codec.
	it("should not accept a field the protocol does not define", ({ validator }) => {
		const schema = Schemas.getPeers.request!;

		assert.undefined(validator.validate(schema, { headers }).error);
		assert.string(validator.validate(schema, { headers: { ...headers, extra: 1 } }).error);
		assert.string(validator.validate(schema, { extra: 1, headers }).error);
	});

	each(
		"should not accept a header with",
		({ dataset: [, change], context }) => {
			assert.string(requestError(context.validator, "getPeers", { headers: { ...headers, ...change } }));
		},
		[
			["no block number", { blockNumber: 0 }],
			["a step after precommit", { step: 3 }],
			["a proposed block hash that is no hash", { proposedBlockHash: "a".repeat(63) }],
			["an upper-case proposed block hash", { proposedBlockHash: "A".repeat(64) }],
			["more prevotes than the round has validators", { validatorsSignedPrevote: bitmap(VALIDATORS + 1) }],
			["more precommits than the round has validators", { validatorsSignedPrecommit: bitmap(VALIDATORS + 1) }],
		] as [string, Record<string, unknown>][],
	);
});
