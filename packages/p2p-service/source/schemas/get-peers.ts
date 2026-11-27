import { constants } from "../constants.js";
import { headers, headersOnly } from "./headers.js";

export const getPeers = {
	request: headersOnly,
	response: {
		additionalProperties: false,
		properties: {
			headers,
			peers: {
				items: {
					additionalProperties: false,
					properties: {
						ip: { anyOf: [{ format: "ipv4" }, { format: "ipv6" }], type: "string" },
						port: { maximum: 65_535, minimum: 0, type: "integer" },
						protocol: { maximum: 1, minimum: 0, type: "integer" },
					},
					required: ["ip", "port", "protocol"],
					type: "object",
				},
				maxItems: constants.MAX_PEERS_GET_PEERS,
				type: "array",
			},
		},
		required: ["headers", "peers"],
		type: "object",
	},
};
