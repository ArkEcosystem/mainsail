import { headers } from "./headers";

export const postProposal = {
	properties: {
		headers,
	},
	required: ["headers"],
	type: "object",
};
