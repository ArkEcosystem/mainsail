import { constants } from "../constants";

export const getPeers = {
	// TODO: Add headers
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
		},
		required: ["ip", "port"],
		type: "object",
	},
	maxItems: constants.MAX_PEERS_GET_PEERS,
	type: "array",
};
