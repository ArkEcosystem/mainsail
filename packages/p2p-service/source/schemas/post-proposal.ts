import { headers } from "./headers.js";

export const postProposal = {
	request: {
		properties: {
			headers,
			proposal: { buffer: {} },
		},
		required: ["headers", "proposal"],
		type: "object",
	},
};
