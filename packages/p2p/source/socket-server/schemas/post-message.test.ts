import { describe } from "@mainsail/test-runner";

import { postMessage } from "./post-message";

describe("postMessage schema", ({ it, assert }) => {
	const schema = postMessage({ getMaxRoundValidators: () => 2 } as any);

	const headers = {
		blockNumber: 2,
		// eslint-disable-next-line unicorn/no-null
		proposedBlockHash: null,
		round: 0,
		step: 1,
		validatorsSignedPrecommit: [false, false],
		validatorsSignedPrevote: [false, false],
		version: "0.0.1",
	};

	const validate = (headerOverrides: object = {}, message: unknown = Buffer.alloc(140)) =>
		schema.validate({ headers: { ...headers, ...headerOverrides }, message }).error;

	it("should accept a message with valid headers", () => {
		assert.undefined(validate());
	});

	it("should accept a lowercase hex proposed block hash", () => {
		assert.undefined(validate({ proposedBlockHash: "ab".repeat(32) }));
	});

	it("should reject a proposed block hash that is not a 64 character lowercase hex string", () => {
		assert.defined(validate({ proposedBlockHash: "not-a-hash" }));
		assert.defined(validate({ proposedBlockHash: "AB".repeat(32) }));
		assert.defined(validate({ proposedBlockHash: "ab".repeat(31) }));
	});

	it("should accept a prerelease version", () => {
		assert.undefined(validate({ version: "1.2.3-alpha.1" }));
	});

	it("should reject a malformed version", () => {
		assert.defined(validate({ version: "abc" }));
		assert.defined(validate({ version: "1.2" }));
		assert.defined(validate({ version: "1.2.3-alpha" }));
	});

	it("should reject an overlong version", () => {
		assert.defined(validate({ version: `1.2.3-${"a".repeat(20)}.1` }));
	});

	it("should reject a message that is not binary", () => {
		assert.defined(validate({}, {}));
	});
});
