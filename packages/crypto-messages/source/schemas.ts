import { Contracts } from "@mainsail/contracts";
import { AnySchemaObject } from "ajv";

export const schemas: Record<
	"proposal" | "prevote" | "precommit" | "proposalLockProof" | "validatorBitmap",
	AnySchemaObject
> = {
	precommit: {
		$id: "precommit",
		properties: {
			blockId: { $ref: "blockId" },
			height: { minimum: 1, type: "integer" },
			round: { minimum: 0, type: "integer" },
			signature: { $ref: "consensusSignature" },
			type: { enum: [Contracts.Crypto.MessageType.Precommit] },
			validatorIndex: { isValidatorIndex: {} },
		},
		required: ["type", "height", "round", "validatorIndex", "signature"],
		type: "object",
	},
	prevote: {
		$id: "prevote",
		properties: {
			blockId: { $ref: "blockId" },
			height: { minimum: 1, type: "integer" },
			round: { minimum: 0, type: "integer" },
			signature: { $ref: "consensusSignature" },
			type: { enum: [Contracts.Crypto.MessageType.Prevote] },
			validatorIndex: { isValidatorIndex: {} },
		},
		required: ["type", "height", "round", "validatorIndex", "signature"],
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
	proposalLockProof: {
		$id: "lockProof",
		properties: {
			signature: { $ref: "consensusSignature" },
			validators: {
				$ref: "validatorBitmap",
			},
		},
		required: ["signature", "validators"],
		type: "object",
	},
	validatorBitmap: {
		$id: "validatorBitmap",
		items: {
			buffer: {},
		},
		limitToActiveValidators: {},
		type: "array",
	},
};
