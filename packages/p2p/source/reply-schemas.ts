import { constants } from "./constants";

const headers = {
	properties: {
		height: {
			minimum: 1,
			type: "integer",
		},
		proposedBlockId: {
			type: ["string", "null"], // TODO: blockId
		},
		round: {
			minimum: 0,
			type: "integer",
		},
		step: {
			maximum: 2,
			minimum: 0,
			type: "integer",
		},
		validatorsSignedPrecommit: {
			items: {
				type: "boolean",
			},
			type: "array",
		},
		validatorsSignedPrevote: {
			items: {
				type: "boolean",
			},
			type: "array",
		},
		version: {
			type: "string", // TODO: version
		},
	},
	required: [
		"height",
		"proposedBlockId",
		"round",
		"step",
		"validatorsSignedPrecommit",
		"validatorsSignedPrevote",
		"version",
	],
	type: "object",
};

export const replySchemas = {
	getBlocks: {
		properties: {
			blocks: {
				items: {
					$ref: "hex",
				},
				maxItems: 400,
				type: "array",
			},
			headers,
		},
		required: ["headers", "blocks"],
		type: "object",
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
			headers,
		},
		required: ["headers", "common"],
		type: "object",
	},
	getMessages: {
		properties: {
			headers,
			// TODO: Improve this schema
			precommits: {
				items: {
					$ref: "hex",
				},
				type: "array",
			},
			prevotes: {
				items: {
					$ref: "hex",
				},
				type: "array",
			},
		},
		required: ["headers", "precommits", "prevotes"],
		type: "object",
	},
	getPeers: {
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
		maxItems: constants.MAX_PEERS_GETPEERS,
		type: "array",
	},
	getProposal: {
		properties: {
			headers,
			proposal: {
				type: "string",
			},
		},
		required: ["headers", "proposal"],
		type: "object",
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
						minimum: 1,
						type: "integer",
					},
				},
				required: ["height", "header"],
				type: "object",
			},
		},
		required: ["headers", "state", "config"],
		type: "object",
	},
	postPrecommit: {
		properties: {
			headers,
		},
		required: ["headers"],
		type: "object",
	},
	postPrevote: {
		properties: {
			headers,
		},
		required: ["headers"],
		type: "object",
	},
	postProposal: {
		properties: {
			headers,
		},
		required: ["headers"],
		type: "object",
	},
	postTransactions: {
		// TODO: Add headers
		type: "array",
	},
};
