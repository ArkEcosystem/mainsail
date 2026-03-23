import type { AnySchemaObject } from "ajv";

export const schemas: Record<"commit" | "commitProof", AnySchemaObject> = {
	commit: {
		$id: "commit",
		additionalProperties: false,
		properties: {
			block: { $ref: "block" },
			proof: { $ref: "commitProof" },
			serialized: { $ref: "hex" },
		},
		required: ["block", "proof", "serialized"],
		type: "object",
	},
	commitProof: {
		$id: "commitProof",
		additionalProperties: false,
		properties: {
			round: { minimum: 0, type: "integer" },
			signature: { $ref: "consensusSignature" },
			validators: {
				items: { type: "boolean" },
				// NOTE: This is not an actual property of the commit proof, but we need it to validate the commit proof against the correct set of validators.
				// We take value from block.number, which is available in the commit schema
				limitToRoundValidators: { blockNumberPath: "block.number" },
				type: "array",
			},
		},
		required: ["round", "signature", "validators"],
		type: "object",
	},
};
