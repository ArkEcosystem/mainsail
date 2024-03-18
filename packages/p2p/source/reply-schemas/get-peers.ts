import { constants } from "../constants.js";
import { headers } from "./headers.js";

export const getPeers = {
	properties: {
		headers,
		peers: {
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
	},
	required: ["headers", "peers"],
	type: "object",
};
