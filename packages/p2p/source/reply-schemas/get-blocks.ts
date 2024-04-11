import { constants } from "../constants.js";
import { headers } from "./headers.js";

export const getBlocks = {
	properties: {
		blocks: {
			items: {
				buffer: {},
			},
			maxItems: constants.MAX_DOWNLOAD_BLOCKS,
			type: "array",
		},
		headers,
	},
	required: ["headers", "blocks"],
	type: "object",
};
