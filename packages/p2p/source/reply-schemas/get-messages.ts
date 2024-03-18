import { headers } from "./headers.js";

export const getMessages = {
	properties: {
		headers,
		precommits: {
			items: {
				buffer: {},
			},
			limitToActiveValidators: { minimum: 0 },
			type: "array",
		},
		prevotes: {
			items: {
				buffer: {},
			},
			limitToActiveValidators: { minimum: 0 },
			type: "array",
		},
	},
	required: ["headers", "precommits", "prevotes"],
	type: "object",
};
