import { headers } from "./headers.js";

export const getStatus = {
	additionalProperties: false,
	properties: {
		config: {
			additionalProperties: false,
			properties: {
				network: {
					additionalProperties: false,
					properties: {
						explorer: {
							maxLength: 128,
							minLength: 0,
							type: "string",
						},
						name: {
							maxLength: 20,
							minLength: 1,
							type: "string",
						},
						nethash: {
							allOf: [
								{
									$ref: "hex",
								},
								{
									maxLength: 64,
									minLength: 64,
									type: "string",
								},
							],
						},
						token: {
							additionalProperties: false,
							properties: {
								name: {
									maxLength: 8,
									minLength: 1,
									type: "string",
								},
								symbol: {
									maxLength: 4,
									minLength: 1,
									type: "string",
								},
							},
							required: ["name", "symbol"],
							type: "object",
						},
						version: {
							maximum: 255,
							minimum: 0,
							type: "integer",
						},
					},
					required: ["name", "nethash", "explorer", "token"],
					type: "object",
				},
				plugins: {
					additionalProperties: false,
					maxProperties: 32,
					minProperties: 0,
					patternProperties: {
						"^.{4,64}$": {
							additionalProperties: false,
							properties: {
								enabled: {
									type: "boolean",
								},
								estimateTotalCount: {
									type: "boolean",
								},
								port: {
									maximum: 65_535,
									minimum: 0,
									type: "integer",
								},
							},
							required: ["port", "enabled"],
							type: "object",
						},
					},
					type: "object",
				},
				version: {
					maxLength: 24,
					minLength: 5,
					type: "string",
				},
			},
			required: ["version", "network", "plugins"],
			type: "object",
		},
		headers,
		state: {
			properties: {
				header: {
					anyOf: [
						{
							$ref: "blockHeader",
						},
						{
							maxProperties: 0,
							minProperties: 0,
							type: "object",
						},
					],
				},
				height: {
					minimum: 0,
					type: "integer",
				},
			},
			required: ["height", "header"],
			type: "object",
		},
	},
	required: ["headers", "state", "config"],
	type: "object",
};
