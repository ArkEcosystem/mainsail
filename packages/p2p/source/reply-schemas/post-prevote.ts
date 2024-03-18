import { headers } from "./headers.js";

export const postPrevote = {
	properties: {
		headers,
	},
	required: ["headers"],
	type: "object",
};
