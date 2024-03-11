import { headers } from "./headers.js";

export const getProposal = {
	properties: {
		headers,
		proposal: {
			buffer: {},
		},
	},
	required: ["headers", "proposal"],
	type: "object",
};
