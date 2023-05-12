import { constants } from "./constants";

export const replySchemas = {
	getBlocks: {
		items: {
			$ref: "blockHeader",
		},
		maxItems: 400,
		type: "array",
	},
	getCommonBlocks: {
		additionalProperties: false,
		properties: {
			common: {
				anyOf: [
					{
						properties: {
							height: {
								minimum: 1,
								type: "integer",
							},
							id: { blockId: {} },
						},
						required: ["height", "id"],
						type: "object",
					},
					{
						type: "null",
					},
				],
			},
		},
		required: ["common"],
		type: "object",
	},
	getPeers: {
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
		maxItems: constants.MAX_PEERS_GETPEERS,
		type: "array",
	},
	getStatus: {
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
			state: {
				properties: {
					currentSlot: {
						minimum: 1,
						type: "integer",
					},
					forgingAllowed: {
						type: "boolean",
					},
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
						minimum: 1,
						type: "integer",
					},
				},
				required: ["height", "forgingAllowed", "currentSlot", "header"],
				type: "object",
			},
		},
		required: ["state", "config"],
		type: "object",
	},
	postBlock: {
		additionalProperties: false,
		properties: {
			height: { minimum: 1, type: "integer" },
			status: { type: "boolean" },
		},
		type: "object",
	},
	postTransactions: {
		type: "array",
	},
};
