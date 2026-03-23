import type { AnySchemaObject } from "ajv";

const proposalUnsigned = {
	$id: "proposalUnsigned",
	additionalProperties: false,
	properties: {
		payloadSerialized: { $ref: "hex" },
		round: { minimum: 0, type: "integer" },
		validRound: { minimum: 0, type: "integer" },
		validatorIndex: { isValidatorIndex: { blockNumberPath: "payloadSerialized" } },
	},
	required: ["round", "payloadSerialized", "validatorIndex"],
	type: "object",
};

export const schemas: Record<"lockProof" | "proposal" | "proposalUnsigned", AnySchemaObject> = {
	lockProof: {
		$id: "lockProof",
		additionalProperties: false,
		properties: {
			// NOTE: This is not an actual property of the lock proof, but we need it to validate the lock proof against the correct set of validators.
			number: { minimum: 0, type: "integer" },

			signature: { $ref: "consensusSignature" },

			validators: {
				items: { type: "boolean" },
				limitToRoundValidators: { blockNumberPath: "number" },
				type: "array",
			},
		},
		required: ["signature", "validators", "number"],
		type: "object",
	},
	proposal: {
		$id: "proposal",
		additionalProperties: false,
		properties: {
			...proposalUnsigned.properties,
			signature: { $ref: "consensusSignature" },
		},
		required: [...proposalUnsigned.required, "signature"],
		type: "object",
	},
	proposalUnsigned,
};
