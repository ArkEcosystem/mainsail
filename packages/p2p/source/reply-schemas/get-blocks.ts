import { headers } from "./headers";

export const getBlocks = {
	properties: {
		blocks: {
			items: {
				buffer: {},
			},
			maxItems: 400,
			type: "array",
		},
		headers,
	},
	required: ["headers", "blocks"],
	type: "object",
};
