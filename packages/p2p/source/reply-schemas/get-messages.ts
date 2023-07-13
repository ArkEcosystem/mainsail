import { headers } from "./headers";

export const getMessages = {
	properties: {
		headers,
		precommits: {
			items: {
				$ref: "hex",
			},
			maxItems: 51, // TODO: Form milestones
			type: "array",
		},
		prevotes: {
			items: {
				$ref: "hex",
			},
			maxItems: 51, // TODO: Form milestones
			type: "array",
		},
	},
	required: ["headers", "precommits", "prevotes"],
	type: "object",
};
