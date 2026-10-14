import { describe } from "@mainsail/test-runner";

import { constants } from "../../constants";
import { postMessage } from "./post-message";

describe("postMessage schema", ({ it, assert }) => {
	const makeSchema = () => postMessage({ getMaxRoundValidators: () => 2 } as any);

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

	it("should accept a message that fits the cap", () => {
		const message = Buffer.alloc(constants.MAX_PAYLOAD_POST_MESSAGE);

		assert.undefined(makeSchema().validate({ headers, message }).error);
	});

	it("should reject a message above the cap", () => {
		const message = Buffer.alloc(constants.MAX_PAYLOAD_POST_MESSAGE + 1);

		assert.defined(makeSchema().validate({ headers, message }).error);
	});

	it("should reject a message that is not binary", () => {
		assert.defined(makeSchema().validate({ headers, message: {} }).error);
	});
});
