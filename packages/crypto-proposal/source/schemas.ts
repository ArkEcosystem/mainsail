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
