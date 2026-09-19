import { describe } from "@mainsail/test-runner";
import { getProposal } from "./get-proposal";

describe("getProposal schema", ({ it, assert }) => {
	const makeSchema = () => getProposal({ getMaxRoundValidators: () => 2 } as any);

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
	const query = {
		blockNumber: 2,
		round: 0,
	};

	it("should accept a request with a query", () => {
		assert.undefined(makeSchema().validate({ headers, query }).error);
	});

	it("should reject a request without a query", () => {
		assert.defined(makeSchema().validate({ headers }).error);
	});

	it("should reject an incomplete query", () => {
		assert.defined(makeSchema().validate({ headers, query: { blockNumber: 2 } }).error);
	});

	it("should reject a negative round", () => {
		assert.defined(makeSchema().validate({ headers, query: { blockNumber: 2, round: -1 } }).error);
	});
});
