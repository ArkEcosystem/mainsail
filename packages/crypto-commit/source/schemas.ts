import type { AnySchemaObject } from "ajv";

export const schemas: Record<"commitProof", AnySchemaObject> = {
	commitProof: {
		$id: "commitProof",
		additionalProperties: false,
		properties: {
			round: { minimum: 0, type: "integer" },
			signature: { $ref: "consensusSignature" },
			validators: {
				items: { type: "boolean" },
				limitToRoundValidators: {},
				type: "array",
			},
		},
		required: ["round", "signature", "validators"],
		type: "object",
	}
};
