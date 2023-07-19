import { headers } from "./headers";

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
