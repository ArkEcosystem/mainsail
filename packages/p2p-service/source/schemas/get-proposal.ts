import { headers } from "./headers.js";

export const getProposal = {
	request: {
		additionalProperties: false,
		properties: {
			headers,
			query: {
				additionalProperties: false,
				properties: {
					blockNumber: { minimum: 1, type: "integer" },
					round: { minimum: 0, type: "integer" },
				},
				required: ["blockNumber", "round"],
				type: "object",
			},
		},
		required: ["headers", "query"],
		type: "object",
	},
};
