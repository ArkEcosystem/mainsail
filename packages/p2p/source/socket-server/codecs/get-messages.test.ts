import { describe } from "@mainsail/test-runner";
import { getMessages } from "./get-messages.js";
import { packBitmap } from "./headers.js";
import { getMessages as proto } from "./proto/protos.js";

describe("getMessages codec", ({ it, assert }) => {
	const bitmap = (offset: number) => Array.from({ length: 53 }, (_, index) => (index + offset) % 3 === 0);

	const headers = {
		blockNumber: 2,
		proposedBlockHash: "a".repeat(64),
		round: 1,
		step: 1,
		validatorsSignedPrecommit: bitmap(1),
		validatorsSignedPrevote: bitmap(0),
		version: "0.0.1",
	};
	const query = {
		blockNumber: 2,
		round: 0,
		validatorsSignedPrecommit: bitmap(2),
		validatorsSignedPrevote: bitmap(1),
	};

	it("should round-trip the header and query bitmaps as booleans", () => {
		const result: any = getMessages.request.deserialize(
			getMessages.request.serialize({ headers, query } as any),
		);

		assert.equal(result.headers.validatorsSignedPrevote, headers.validatorsSignedPrevote);
		assert.equal(result.headers.validatorsSignedPrecommit, headers.validatorsSignedPrecommit);
		assert.equal(result.query.validatorsSignedPrevote, query.validatorsSignedPrevote);
		assert.equal(result.query.validatorsSignedPrecommit, query.validatorsSignedPrecommit);
		assert.equal(result.query.blockNumber, 2);
		assert.equal(result.query.round, 0);
	});

	it("should round-trip the response headers", () => {
		const result: any = getMessages.response.deserialize(
			getMessages.response.serialize({ headers, precommits: [Buffer.from([1])], prevotes: [] } as any),
		);

		assert.equal(result.headers.validatorsSignedPrevote, headers.validatorsSignedPrevote);
		assert.equal(result.headers.validatorsSignedPrecommit, headers.validatorsSignedPrecommit);
	});

	it("should keep a full request with four 53-validator bitmaps under 200 bytes", () => {
		assert.true(getMessages.request.serialize({ headers, query } as any).length < 200);
	});

	it("should reject a bitmap that contradicts its own count byte", () => {
		const wire = Buffer.from(
			proto.GetMessagesRequest.encode({
				headers: {
					...headers,
					validatorsSignedPrecommit: packBitmap(headers.validatorsSignedPrecommit),
					validatorsSignedPrevote: packBitmap(headers.validatorsSignedPrevote),
				},
				query: {
					blockNumber: 2,
					round: 0,
					// Count byte claims 10 validators (2 data bytes), but only 1 follows.
					validatorsSignedPrevote: Buffer.from([10, 0xff]),
					validatorsSignedPrecommit: packBitmap([]),
				},
			}).finish(),
		);

		assert.throws(() => getMessages.request.deserialize(wire));
	});
});
