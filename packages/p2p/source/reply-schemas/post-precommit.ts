import { headers } from "./headers.js";

export const postPrecommit = {
	properties: {
		headers,
	},
	required: ["headers"],
	type: "object",
};
