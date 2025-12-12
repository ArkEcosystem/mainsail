import { Enums } from "@mainsail/constants";
import type { AnySchemaObject } from "ajv";

export const schemas: Record<"prevote" | "precommit", AnySchemaObject> = {
	precommit: {
		$id: "precommit",
		properties: {
			blockHash: { $ref: "blockHash" },
			blockNumber: { minimum: 1, type: "integer" },
			round: { minimum: 0, type: "integer" },
			signature: { $ref: "consensusSignature" },
			type: { enum: [Enums.Crypto.MessageType.Prevote, Enums.Crypto.MessageType.Precommit] },
			validatorIndex: { isValidatorIndex: {} },
		},
		required: ["type", "blockNumber", "round", "validatorIndex", "signature"],
		type: "object",
	},
	prevote: {
		$id: "prevote",
		properties: {
			blockHash: { $ref: "blockHash" },
			blockNumber: { minimum: 1, type: "integer" },
			round: { minimum: 0, type: "integer" },
			signature: { $ref: "consensusSignature" },
			type: { enum: [Enums.Crypto.MessageType.Prevote, Enums.Crypto.MessageType.Precommit] },
			validatorIndex: { isValidatorIndex: {} },
		},
		required: ["type", "blockNumber", "round", "validatorIndex", "signature"],
		type: "object",
	},
};
