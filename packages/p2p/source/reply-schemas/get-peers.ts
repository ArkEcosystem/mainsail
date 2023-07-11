import { constants } from "../constants";
import { headers } from "./headers";

export const getPeers = {
	properties: {
		headers,
		maxItems: constants.MAX_PEERS_GET_PEERS,
		peers: {
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
		type: "array",
	},
	required: ["headers", "peers"],
	type: "object",
};
