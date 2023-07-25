export const headers = {
	additionalProperties: false,
	properties: {
		height: {
			minimum: 1,
			type: "integer",
		},
		proposedBlockId: {
			$ref: "blockId",
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
			isValidatorBitmap: { minimum: 0 },
		},
		validatorsSignedPrevote: {
			isValidatorBitmap: { minimum: 0 },
		},
		version: {
			pattern: "^\\d+\\.\\d+\\.\\d+$",
			type: "string",
		},
	},
	required: [
		"height",
		// "proposedBlockId",
		"round",
		"step",
		"validatorsSignedPrecommit",
		"validatorsSignedPrevote",
		"version",
	],
	type: "object",
};
