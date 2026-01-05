/* eslint-disable sort-keys-fix/sort-keys-fix */
import type { Contracts } from "@mainsail/contracts";

export const schemaForSignature: Record<string, Contracts.Serializer.SerializationSchema> = {
	type: {
		type: "uint8",
	},
	blockNumber: {
		type: "uint32",
	},
	round: {
		type: "uint32",
	},
	blockHash: {
		type: "blockHash",
		optional: true,
	},
};

export const schema: Record<string, Contracts.Serializer.SerializationSchema> = {
	...schemaForSignature,
	validatorIndex: {
		type: "uint8",
	},
	signature: {
		type: "consensusSignature",
	},
};
