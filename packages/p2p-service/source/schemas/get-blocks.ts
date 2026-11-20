import { constants } from "../constants.js";
import { headers } from "./headers.js";

export const getBlocks = {
	request: {
		properties: {
			fromBlockNumber: { minimum: 0, type: "integer" },
			headers,
			limit: { maximum: constants.MAX_DOWNLOAD_BLOCKS, minimum: 1, type: "integer" },
		},
		required: ["fromBlockNumber", "headers", "limit"],
		type: "object",
	},
};
