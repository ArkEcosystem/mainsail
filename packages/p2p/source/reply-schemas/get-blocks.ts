import { constants } from "../constants";
import { headers } from "./headers";

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
