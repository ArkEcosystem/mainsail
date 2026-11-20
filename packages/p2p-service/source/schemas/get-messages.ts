import { bitmap, headers } from "./headers.js";

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
};
