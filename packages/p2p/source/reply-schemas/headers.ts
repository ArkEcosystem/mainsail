export const headers = {
	additionalProperties: false,
	properties: {
		blockNumber: {
			minimum: 1,
			type: "integer",
		},
		proposedBlockHash: {
			$ref: "blockHash",
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
				typeof: "boolean",
			},
			limitToRoundValidators: {},
			type: "array",
		},
		validatorsSignedPrevote: {
			items: {
				typeof: "boolean",
			},
			limitToRoundValidators: {},
			type: "array",
		},
		version: {
			pattern: "^\\d+\\.\\d+\\.\\d+(-[a-zA-Z0-9.-]+\\.\\d+)?$",
			type: "string",
		},
	},
	required: [
		"blockNumber",
		// "proposedBlockHash",
		"round",
		"step",
		"validatorsSignedPrecommit",
		"validatorsSignedPrevote",
		"version",
	],
	type: "object",
};
