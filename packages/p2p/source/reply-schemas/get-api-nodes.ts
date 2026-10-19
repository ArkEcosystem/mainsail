import { constants } from "../constants.js";
import { headers } from "./headers.js";

export const getApiNodes = {
	properties: {
		apiNodes: {
			items: {
				additionalProperties: false,
				properties: {
					url: {
						format: "publicHttpUrl",
						maxLength: constants.MAX_API_NODE_URL_LENGTH,
						type: "string",
					},
				},
				required: ["url"],
				type: "object",
			},
			maxItems: constants.MAX_PEERS_GET_API_NODES,
			type: "array",
		},
		headers,
	},
	required: ["headers", "apiNodes"],
	type: "object",
};
