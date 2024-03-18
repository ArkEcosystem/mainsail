import { headers } from "./headers.js";

export const postProposal = {
	properties: {
		headers,
	},
	required: ["headers"],
	type: "object",
};
