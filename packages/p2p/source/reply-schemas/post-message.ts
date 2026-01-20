import { headers } from "./headers.js";

export const postMessage = {
	properties: {
		headers,
	},
	required: ["headers"],
	type: "object",
};
