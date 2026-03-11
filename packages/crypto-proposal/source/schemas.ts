import type { AnySchemaObject } from "ajv";

export const schemas: Record<"lockProof" | "proposal", AnySchemaObject> = {
	lockProof: {
		$id: "lockProof",
		additionalProperties: false,
		properties: {
			signature: { $ref: "consensusSignature" },
			validators: {
				items: { type: "boolean" },
				limitToRoundValidators: {},
				type: "array",
			},
		},
		required: ["signature", "validators"],
		type: "object",
	},
	proposal: {
		$id: "proposal",
		properties: {
			data: {
				properties: {
					serialized: { $ref: "hex" },
				},
				required: ["serialized"],
				type: "object",
			},
			round: { minimum: 0, type: "integer" },
			signature: { $ref: "consensusSignature" },
			validRound: { minimum: 0, type: "integer" },
			validatorIndex: { isValidatorIndex: {} },
		},
		required: ["round", "data", "validatorIndex", "signature"],
		type: "object",
	},
};
