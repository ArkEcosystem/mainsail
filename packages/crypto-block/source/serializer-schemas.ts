/* eslint-disable sort-keys-fix/sort-keys-fix */
import type { Contracts } from "@mainsail/contracts";

export const schema: Record<string, Contracts.Serializer.DeserializationSchema> = {
	version: {
		type: "uint8",
	},
	timestamp: {
		type: "uint48",
	},
	number: {
		type: "uint32",
	},
	round: {
		type: "uint32",
	},
	parentHash: {
		type: "hash",
	},
	stateRoot: {
		type: "hash",
	},
	logsBloom: {
		type: "hash",
		size: 256,
	},
	transactionsCount: {
		type: "uint16",
	},
	gasUsed: {
		type: "uint32",
	},
	fee: {
		type: "uint256",
	},
	reward: {
		type: "uint256",
	},
	payloadSize: {
		type: "uint32",
	},
	transactionsRoot: {
		type: "hash",
	},
	proposer: {
		type: "address",
	},
};

export const transactionsSchema: Record<string, Contracts.Serializer.SerializationSchema> = {
	transactions: {
		type: "transactions",
	},
};

export const schemaWithTransactions: Record<string, Contracts.Serializer.SerializationSchema> = {
	...schema,
	transactions: {
		type: "transactions",
	},
};
