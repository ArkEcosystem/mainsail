import { headers } from "./headers.js";

export const postMessage = {
	request: {
		properties: {
			headers,
			message: { buffer: {} },
		},
		required: ["headers", "message"],
		type: "object",
	},
};
