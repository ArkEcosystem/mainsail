import { bitmap, headers } from "./headers.js";

const messages = {
	items: { buffer: {} },
	limitToRoundValidators: { blockNumberPath: "headers.blockNumber", minimum: 0 },
	type: "array",
};

export const getMessages = {
	request: {
		additionalProperties: false,
		properties: {
			headers,
			query: {
				additionalProperties: false,
				properties: {
					blockNumber: { minimum: 1, type: "integer" },
					round: { minimum: 0, type: "integer" },
					validatorsSignedPrecommit: bitmap("query.blockNumber"),
					validatorsSignedPrevote: bitmap("query.blockNumber"),
				},
				required: ["blockNumber", "round", "validatorsSignedPrecommit", "validatorsSignedPrevote"],
				type: "object",
			},
		},
		required: ["headers", "query"],
		type: "object",
	},
	// The votes are those of one round, so there are at most as many of each kind as the round has
	// validators. A peer answers with votes only when it is at the block number we asked for, which is
	// then the one in its header.
	response: {
		additionalProperties: false,
		properties: {
			headers,
			precommits: messages,
			prevotes: messages,
		},
		required: ["headers", "precommits", "prevotes"],
		type: "object",
	},
};
