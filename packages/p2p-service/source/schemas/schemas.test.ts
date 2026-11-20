import { makeKeywords } from "@mainsail/crypto-validation";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { Validator } from "@mainsail/validation";

import { Codecs } from "../codecs/index";
import { Schemas } from "./index";

// Every case sends the data through the real codec first: the schemas describe what the codec hands
// over, and a schema that rejected such data would ban honest peers.
describe<{
	validator: Validator;
}>("Schemas", ({ it, assert, beforeEach, each }) => {
	const VALIDATORS = 4;
	const bitmap = (length = VALIDATORS) => Array.from({ length }, (_, index) => index % 2 === 0);

	const headers = {
		blockNumber: 5,
		proposedBlockHash: "a".repeat(64),
		round: 1,
		step: 2,
		validatorsSignedPrecommit: bitmap(),
		validatorsSignedPrevote: bitmap(),
		version: "0.0.1-rc.9",
	};

	// The genesis milestone has no validators; they start with the first block.
	const configuration = {
		getMilestone: (blockNumber?: number) => ({ roundValidators: blockNumber ? VALIDATORS : 0 }),
	};

	const requests: Record<keyof typeof Schemas, Record<string, unknown>> = {
		getApiNodes: {},
		getBlocks: { fromBlockNumber: 1, limit: 400 },
		getMessages: {
			query: { blockNumber: 5, round: 0, validatorsSignedPrecommit: bitmap(), validatorsSignedPrevote: bitmap() },
		},
		getPeers: {},
		getProposal: { query: { blockNumber: 5, round: 0 } },
		getStatus: {},
		postMessage: { message: Buffer.from("message") },
		postProposal: { proposal: Buffer.from("proposal") },
	};

	const decodeRequest = (route: keyof typeof Schemas, data: Record<string, unknown>): unknown => {
		const codec = Codecs[route].request as {
			deserialize: (payload: Buffer) => unknown;
			serialize: (data: unknown) => Buffer;
		};

		return codec.deserialize(codec.serialize(data));
	};

	const requestError = (validator: Validator, route: keyof typeof Schemas, data: Record<string, unknown>) =>
		validator.validate(Schemas[route].request!, decodeRequest(route, data)).error;

	beforeEach((context) => {
		context.validator = new Application().resolve(Validator);

		for (const keyword of Object.values(makeKeywords(configuration as any))) {
			context.validator.addKeyword(keyword);
		}
	});

	each(
		"request - should accept what the codec hands over for",
		({ dataset: route, context }) => {
			assert.undefined(requestError(context.validator, route, { ...requests[route], headers }));
		},
		Object.keys(requests) as (keyof typeof Schemas)[],
	);

	each(
		"request - should not accept a request without the header for",
		({ dataset: route, context }) => {
			assert.string(requestError(context.validator, route, requests[route]));
		},
		Object.keys(requests) as (keyof typeof Schemas)[],
	);

	it("request - should accept a header without a proposed block hash and with empty bitmaps", ({ validator }) => {
		const { proposedBlockHash, ...withoutHash } = headers;

		assert.undefined(requestError(validator, "getPeers", { headers: withoutHash }));
		assert.undefined(
			requestError(validator, "getPeers", {
				headers: { ...headers, validatorsSignedPrecommit: [], validatorsSignedPrevote: [] },
			}),
		);
	});

	each(
		"request - should not accept a header with",
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
			["no version", { version: "" }],
			["a version that is no version", { version: "latest" }],
			["a version of more than 24 characters", { version: `1.0.0-${"a".repeat(17)}.1` }],
		] as [string, Record<string, unknown>][],
	);

	it("request - should measure the header bitmaps against the milestone of the header's block number", ({
		validator,
	}) => {
		// The validator's own milestone is the genesis one, with no validators at all.
		assert.equal(configuration.getMilestone().roundValidators, 0);

		assert.undefined(requestError(validator, "getPeers", { headers }));
	});

	each(
		"request - getBlocks should not accept",
		({ dataset: [, change], context }) => {
			assert.string(requestError(context.validator, "getBlocks", { ...requests.getBlocks, ...change, headers }));
		},
		[
			["no limit", { limit: 0 }],
			["a limit above the largest batch", { limit: 401 }],
		] as [string, Record<string, unknown>][],
	);

	it("request - getBlocks should accept a request from the genesis block", ({ validator }) => {
		assert.undefined(requestError(validator, "getBlocks", { fromBlockNumber: 0, headers, limit: 1 }));
	});

	each(
		"request - getMessages should not accept",
		({ dataset: [, query], context }) => {
			assert.string(requestError(context.validator, "getMessages", { headers, query }));
		},
		[
			["no query", undefined],
			["a query without a block number", { ...(requests.getMessages.query as object), blockNumber: 0 }],
			[
				"a query with more prevotes than the round has validators",
				{ ...(requests.getMessages.query as object), validatorsSignedPrevote: bitmap(VALIDATORS + 1) },
			],
			[
				"a query with more precommits than the round has validators",
				{ ...(requests.getMessages.query as object), validatorsSignedPrecommit: bitmap(VALIDATORS + 1) },
			],
		] as [string, Record<string, unknown> | undefined][],
	);

	each(
		"request - getProposal should not accept",
		({ dataset: [, query], context }) => {
			assert.string(requestError(context.validator, "getProposal", { headers, query }));
		},
		[
			["no query", undefined],
			["a query without a block number", { blockNumber: 0, round: 0 }],
		] as [string, Record<string, unknown> | undefined][],
	);
});
