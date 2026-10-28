import { describe } from "@mainsail/test-runner";
import { getMessages } from "./get-messages";

describe("getMessages schema", ({ it, assert }) => {
	const makeSchema = () => getMessages({ getMaxRoundValidators: () => 2 } as any);

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
		validatorsSignedPrecommit: [false, false],
		validatorsSignedPrevote: [false, false],
	};

	it("should accept a request with a query", () => {
		assert.undefined(makeSchema().validate({ headers, query }).error);
	});

	it("should reject a request without a query", () => {
		assert.defined(makeSchema().validate({ headers }).error);
	});

	it("should reject an incomplete query", () => {
		assert.defined(makeSchema().validate({ headers, query: { blockNumber: 2, round: 0 } }).error);
	});

	it("should reject a query with oversized bitmaps", () => {
		assert.defined(
			makeSchema().validate({
				headers,
				query: { ...query, validatorsSignedPrevote: [false, false, false] },
			}).error,
		);
	});
});
