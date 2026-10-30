import { describe } from "@mainsail/test-runner";
import { getStatus } from "./get-status.js";

describe("PeerCodec", ({ it, assert }) => {
	const headers = {
		blockNumber: 2,
		proposedBlockHash: "a".repeat(64),
		round: 1,
		step: 1,
		validatorsSignedPrecommit: [true, false, true],
		validatorsSignedPrevote: [false, true, false],
		version: "0.0.1",
	};

	it("#getStatus should serde request", () => {
		const result: any = getStatus.request.deserialize(getStatus.request.serialize({ headers } as any));

		assert.equal(result.headers.version, headers.version);
		assert.equal(result.headers.blockNumber, headers.blockNumber);
		assert.equal(result.headers.round, headers.round);
		assert.equal(result.headers.validatorsSignedPrevote, headers.validatorsSignedPrevote);
		assert.equal(result.headers.validatorsSignedPrecommit, headers.validatorsSignedPrecommit);
	});

	it("#getStatus should serde response", () => {
		const response = {
			config: {
				network: {
					explorer: "exploer",
					name: "devnet",
					nethash: "nethash",
					token: { name: "DARK", symbol: "TѦ" },
					version: 30,
				},
				plugins: {
					"@mainsail/api": { enabled: true, estimateTotalCount: false, port: 4003 },
					"@mainsail/webhooks": { enabled: false, estimateTotalCount: false, port: 4004 },
				},
				version: "0.0.1",
			},
			headers,
			state: {
				blockHash: "70e20568d4a346da847dc1a8a7493e70e5a028709b7dfb6ec6da171d0daa03b5",
				blockNumber: 3,
			},
		};

		const result = getStatus.response.deserialize(getStatus.response.serialize(response as any));

		assert.equal(result, response);
	});
});
