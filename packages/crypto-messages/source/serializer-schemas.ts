/* eslint-disable perfectionist/sort-objects */
import type { Contracts } from "@mainsail/contracts";

const messageFields: Record<string, Contracts.Serializer.SerializationSchema> = {
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

export const schemaForSignature: Record<string, Contracts.Serializer.SerializationSchema> = {
	genesisBlockHash: {
		type: "hash",
	},
	previousBlockHash: {
		type: "hash",
	},
	...messageFields,
};

export const schema: Record<string, Contracts.Serializer.SerializationSchema> = {
	...messageFields,
	validatorIndex: {
		type: "uint8",
	},
	signature: {
		type: "consensusSignature",
	},
};
