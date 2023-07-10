import { headers } from "./headers";

export const getMessages = {
	properties: {
		headers,
		// TODO: Improve this schema
		precommits: {
			items: {
				$ref: "hex",
			},
			type: "array",
		},
		prevotes: {
			items: {
				$ref: "hex",
			},
			type: "array",
		},
	},
	required: ["headers", "precommits", "prevotes"],
	type: "object",
};
