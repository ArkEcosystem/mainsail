import { SchemaObject } from "ajv";

const transactionId: SchemaObject = {
	$id: "transactionId",
	allOf: [{ maxLength: 64, minLength: 64 }, { $ref: "hex" }],
	type: "string",
};

const prefixedTransactionId: SchemaObject = {
	$id: "prefixedTransactionId",
	allOf: [{ maxLength: 66, minLength: 66 }, { $ref: "prefixedHex" }],
	type: "string",
};

const networkByte: SchemaObject = {
	$id: "networkByte",
	network: true,
};

export const schemas = {
	networkByte,
	prefixedTransactionId,
	transactionId,
};

export const transactionBaseSchema: SchemaObject = {
	properties: {
		gasLimit: { transactionGasLimit: {} },
		gasPrice: { transactionGasPrice: {} },
		id: { anyOf: [{ $ref: "transactionId" }, { type: "null" }] },
		// Legacy
		legacySecondSignature: {
			allOf: [{ maxLength: 146, minLength: 140 }, { $ref: "alphanumeric" }],
			type: "string",
		},

		network: { $ref: "networkByte" },

		nonce: { bignumber: { minimum: 0 } },

		r: { type: "string" },

		// TODO: prefixed hex
		s: { type: "string" },

		senderAddress: { $ref: "address" },

		senderLegacyAddress: { type: "string" },

		senderPublicKey: { $ref: "publicKey" },

		v: { maximum: 1, minimum: 0, type: "number" },
		value: { bignumber: { maximum: undefined, minimum: 0 } },
	},
	required: ["senderAddress", "senderPublicKey", "gasPrice", "gasLimit", "value", "nonce"],
	type: "object",
};
