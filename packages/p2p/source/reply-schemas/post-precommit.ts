import { headers } from "./headers";

export const postPrecommit = {
	properties: {
		headers,
	},
	required: ["headers"],
	type: "object",
};
