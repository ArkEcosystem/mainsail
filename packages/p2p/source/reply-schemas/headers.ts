export const headers = {
	additionalProperties: false,
	properties: {
		height: {
			minimum: 1,
			type: "integer",
		},
		proposedBlockId: {
			oneOf: [
				{
					ref: "blockId",
				},
				{
					type: "null",
				},
			],
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
