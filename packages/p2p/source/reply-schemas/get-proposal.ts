import { headers } from "./headers";

export const getProposal = {
	properties: {
		headers,
		proposal: {
			type: "string",
		},
	},
	required: ["headers", "proposal"],
	type: "object",
};
