import { Validator } from "@mainsail/validation/source/validator";

import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { parseBlockNumber } from "./parse-block-number";
import {
	Proposal,
	ProposalWithLockProof,
	ProposalWithLockProofAndValidRound,
	ProposalWithValidRound,
} from "../../crypto-proposal/test/fixtures/index.js";

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
				some: { path: "not a number" },
			},
		});
		assert.undefined(result);
	});

	it("should return undefined if value at path is string representation of a number", () => {
		const result = parseBlockNumber("some.path", {
			rootData: {
				some: { path: "42" },
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
				some: { path: 42 },
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
		for (const payloadSerialized of [
			Proposal.payloadSerialized,
			ProposalWithLockProof.payloadSerialized,
			ProposalWithLockProofAndValidRound.payloadSerialized,
			ProposalWithValidRound.payloadSerialized,
		]) {
			const result = parseBlockNumber("payloadSerialized", {
				rootData: {
					payloadSerialized,
				},
			});
			assert.equal(result, 2);
		}
	});

	it("should return undefined if parentSchema is undefined", () => {
		assert.undefined(parseBlockNumber("some.path", undefined));
	});

	it("should return undefined if payloadSerialized path is used but rootData is undefined", () => {
		assert.undefined(parseBlockNumber("payloadSerialized", { rootData: undefined }));
	});

	it("should return undefined if an intermediate path segment is null", () => {
		// Regression: `block.number` over a null block must not throw a TypeError.
		const result = parseBlockNumber("block.number", {
			rootData: {
				block: null,
			},
		});
		assert.undefined(result);
	});

	it("should return undefined if an intermediate path segment is a primitive", () => {
		const result = parseBlockNumber("a.b", {
			rootData: {
				a: 5,
			},
		});
		assert.undefined(result);
	});

	it("should return undefined if payloadSerialized is not a string", () => {
		for (const payloadSerialized of [123, ["a".repeat(40)], {}, true]) {
			const result = parseBlockNumber("payloadSerialized", {
				rootData: { payloadSerialized },
			});
			assert.undefined(result);
		}
	});

	it("should return undefined if the lock-proof prefix is non-hex", () => {
		// "zz" -> NaN lock-proof size -> NaN offset; must fail closed, not throw.
		const payloadSerialized = "zz" + "00".repeat(14);
		const result = parseBlockNumber("payloadSerialized", {
			rootData: { payloadSerialized },
		});
		assert.undefined(result);
	});

	it("should return undefined if the computed offset exceeds the payload length", () => {
		// "ff" -> lock-proof size 512 -> offset 526, far beyond the 30-char payload.
		const payloadSerialized = "ff" + "00".repeat(14);
		const result = parseBlockNumber("payloadSerialized", {
			rootData: { payloadSerialized },
		});
		assert.undefined(result);
	});

	it("should return undefined if the block-number region contains invalid hex", () => {
		// prefix "00" -> offset 16; bytes [16,24) are non-hex, so readUInt32LE would throw.
		const payloadSerialized = "00" + "0".repeat(14) + "zz".repeat(4) + "00".repeat(3);
		const result = parseBlockNumber("payloadSerialized", {
			rootData: { payloadSerialized },
		});
		assert.undefined(result);
	});
});
