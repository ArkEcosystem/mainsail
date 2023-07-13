import { headers } from "./headers";

export const getBlocks = {
	properties: {
		blocks: {
			items: {
				$ref: "hex",
			},
			maxItems: 400,
			type: "array",
		},
		headers,
	},
	required: ["headers", "blocks"],
	type: "object",
};
