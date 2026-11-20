import { headers } from "./headers.js";

export const postProposal = {
	request: {
		additionalProperties: false,
		properties: {
			headers,
			proposal: { buffer: {} },
		},
		required: ["headers", "proposal"],
		type: "object",
	},
};
