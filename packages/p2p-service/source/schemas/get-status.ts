import { headers, headersOnly } from "./headers.js";

const hash = { pattern: "^[0-9a-f]{64}$", type: "string" };

export const getStatus = {
	request: headersOnly,
	response: {
		additionalProperties: false,
		properties: {
			config: {
				additionalProperties: false,
				properties: {
					network: {
						additionalProperties: false,
						properties: {
							explorer: { maxLength: 128, type: "string" },
							name: { maxLength: 20, minLength: 1, type: "string" },
							nethash: hash,
							token: {
								additionalProperties: false,
								properties: {
									name: { maxLength: 8, minLength: 1, type: "string" },
									symbol: { maxLength: 4, minLength: 1, type: "string" },
								},
								required: ["name", "symbol"],
								type: "object",
							},
							version: { maximum: 255, minimum: 0, type: "integer" },
						},
						required: ["explorer", "name", "nethash", "token", "version"],
						type: "object",
					},
					// Keyed by the package name of the plugin.
					plugins: {
						additionalProperties: false,
						maxProperties: 32,
						patternProperties: {
							"^.{4,64}$": {
								additionalProperties: false,
								properties: {
									enabled: { type: "boolean" },
									estimateTotalCount: { type: "boolean" },
									port: { maximum: 65_535, minimum: 0, type: "integer" },
								},
								required: ["enabled", "port"],
								type: "object",
							},
						},
						type: "object",
					},
				},
				required: ["network", "plugins"],
				type: "object",
			},
			headers,
			state: {
				additionalProperties: false,
				properties: {
					blockHash: hash,
					blockNumber: { minimum: 0, type: "integer" },
				},
				required: ["blockHash", "blockNumber"],
				type: "object",
			},
		},
		required: ["config", "headers", "state"],
		type: "object",
	},
};
