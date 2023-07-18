import { headers } from "./headers";

export const getMessages = {
	properties: {
		headers,
		precommits: {
			items: {
				buffer: {},
			},
			maxItems: 51, // TODO: Form milestones
			type: "array",
		},
		prevotes: {
			items: {
				buffer: {},
			},
			maxItems: 51, // TODO: Form milestones
			type: "array",
		},
	},
	required: ["headers", "precommits", "prevotes"],
	type: "object",
};
