import { constants } from "../constants.js";
import { headers, headersOnly } from "./headers.js";

export const getApiNodes = {
	request: headersOnly,
	response: {
		additionalProperties: false,
		properties: {
			apiNodes: {
				items: {
					additionalProperties: false,
					properties: {
						url: { maxLength: constants.MAX_API_NODE_URL_LENGTH, type: "string" },
					},
					required: ["url"],
					type: "object",
				},
				maxItems: constants.MAX_API_NODES_GET_API_NODES,
				type: "array",
			},
			headers,
		},
		required: ["apiNodes", "headers"],
		type: "object",
	},
};
