import { headers } from "./headers";

export const getProposal = {
	properties: {
		headers,
		// TODO: Make optional
		proposal: {
			type: "string",
		},
	},
	required: ["headers", "proposal"],
	type: "object",
};
