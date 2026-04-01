import type { AnySchemaObject } from "ajv";

import { Enums } from "@mainsail/constants";

export const schemas: Record<"message", AnySchemaObject> = {
	message: {
		$id: "message",
		additionalProperties: false,
		properties: {
			blockHash: { $ref: "blockHash" },
			blockNumber: { minimum: 1, type: "integer" },
			round: { minimum: 0, type: "integer" },
			signature: { $ref: "consensusSignature" },
			type: { enum: [Enums.Crypto.MessageType.Prevote, Enums.Crypto.MessageType.Precommit] },
			validatorIndex: { isValidatorIndex: { blockNumberPath: "blockNumber" } },
		},
		required: ["type", "blockNumber", "round", "validatorIndex", "signature"],
		type: "object",
	},
};
