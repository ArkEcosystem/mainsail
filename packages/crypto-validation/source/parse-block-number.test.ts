
import { Validator } from "@mainsail/validation/source/validator";

import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { parseBlockNumber } from "./parse-block-number";
import { Proposal, ProposalWithLockProof, ProposalWithLockProofAndValidRound, ProposalWithValidRound } from "../../crypto-proposal/test/fixtures/index.js";

describe<{
	app: Application;
	validator: Validator;
}>("Keywords", ({ it, beforeEach, assert }) => {
	it("should return undefined if path is undefined", () => {
		const result = parseBlockNumber(undefined, {
			rootData: {},
		});
		assert.is(result, undefined);
	});

	it("should return undefined if path does not exist in rootData", () => {
		const result = parseBlockNumber("nonexistent.path", {
			rootData: {},
		});
		assert.undefined(result);
	});

	it("should return undefined if value at path is not a number", () => {
		const result = parseBlockNumber("some.path", {
			rootData: {
				some: {	path: "not a number" },
			},
		});
		assert.undefined(result);
	});

	it("should return undefined if value at path is string representation of a number", () => {
		const result = parseBlockNumber("some.path", {
			rootData: {
				some: {	path: "42" },
			},
		});
		assert.undefined(result);
	});

	it("should return the number at the specified path (root)", () => {
		const result = parseBlockNumber("path", {
			rootData: {
				path: 42,
			},
		});
		assert.equal(result, 42);
	});

	it("should return the number at the specified path (nested)", () => {
		const result = parseBlockNumber("some.path", {
			rootData: {
				some: {	path: 42 },
			},
		});
		assert.equal(result, 42);
	});

	it("should return undefined if payloadSerialized is missing", () => {
		const result = parseBlockNumber("payloadSerialized", {
			rootData: {},
		});
		assert.undefined(result);
	});

	it("should return undefined if payloadSerialized is too short", () => {
		const result = parseBlockNumber("payloadSerialized", {
			rootData: {
				payloadSerialized: "00",
			},
		});
		assert.undefined(result);
	});

	it("should return the block number from payloadSerialized", () => {
		const payloadSerialized = Proposal.payloadSerialized;

		for(const payloadSerialized of [Proposal.payloadSerialized, ProposalWithLockProof.payloadSerialized, ProposalWithLockProofAndValidRound.payloadSerialized, ProposalWithValidRound.payloadSerialized]) {
			const result = parseBlockNumber("payloadSerialized", {
				rootData: {
					payloadSerialized,
				},
			});
			assert.equal(result, 2);
		};
	});
});
