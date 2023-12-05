import { constants } from "../constants";
import { headers } from "./headers";

export const getApiNodes = {
	properties: {
		apiNodes: {
			items: {
				properties: {
					ip: {
						anyOf: [
							{
								format: "ipv4",
								type: "string",
							},
							{
								format: "ipv6",
								type: "string",
							},
						],
					},
					port: {
						maximum: 65_535,
						minimum: 0,
						type: "integer",
					},
					protocol: {
						maximum: 1,
						minimum: 0,
						type: "integer",
					},
				},
				required: ["ip", "port", "protocol"],
				type: "object",
			},
			maxItems: constants.MAX_PEERS_GET_PEERS,
			type: "array",
		},
		headers,
	},
	required: ["headers", "apiNodes"],
	type: "object",
};
