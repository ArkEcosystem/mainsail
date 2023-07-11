import { headers } from "./headers";

export const getMessages = {
	properties: {
		headers,
		precommits: {
			// TODO: Set max items
			items: {
				$ref: "hex",
			},
			type: "array",
		},
		prevotes: {
			// TODO: Set max items
			items: {
				$ref: "hex",
			},
			type: "array",
		},
	},
	required: ["headers", "precommits", "prevotes"],
	type: "object",
};
