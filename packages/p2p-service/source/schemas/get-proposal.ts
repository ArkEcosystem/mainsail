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
	// A peer without the proposal answers with an empty buffer.
	response: {
		additionalProperties: false,
		properties: {
			headers,
			proposal: { buffer: {} },
		},
		required: ["headers", "proposal"],
		type: "object",
	},
};
