import { headers } from "./headers.js";

export const postMessage = {
	request: {
		additionalProperties: false,
		properties: {
			headers,
			message: { buffer: {} },
		},
		required: ["headers", "message"],
		type: "object",
	},
};
