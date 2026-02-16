import type { SchemaObject } from "ajv";

const transactionHash: SchemaObject = {
	$id: "transactionHash",
	allOf: [{ maxLength: 64, minLength: 64 }, { $ref: "hex" }],
	type: "string",
};

const prefixedTransactionHash: SchemaObject = {
	$id: "prefixedTransactionHash",
	allOf: [{ maxLength: 66, minLength: 66 }, { $ref: "prefixedQuantityHex" }],
	type: "string",
};

const networkByte: SchemaObject = {
	$id: "networkByte",
	network: true,
};

const transaction: SchemaObject = {
	$id: "transaction",
	properties: {
		/* eslint-disable sort-keys-fix/sort-keys-fix */
		hash: { $ref: "transactionHash" }, // Signed

		network: { $ref: "networkByte" },
		to: { $ref: "address" },
		value: { bignumber: { maximum: undefined, minimum: 0 } },
		gasLimit: { transactionGasLimit: {} },
		gasPrice: { transactionGasPrice: {} },
		nonce: { bignumber: { minimum: 0 } },
		data: { bytecode: {} },

		from: { $ref: "address" },
		senderPublicKey: { $ref: "publicKey" },
		senderLegacyAddress: { type: "string" },

		// Signed
		v: { maximum: 1, minimum: 0, type: "number" },
		r: {
			allOf: [{ maxLength: 64, minLength: 64 }, { $ref: "hex" }],
			type: "string",
		},
		s: {
			allOf: [{ maxLength: 64, minLength: 64 }, { $ref: "hex" }],
			type: "string",
		},

		legacySecondSignature: {
			allOf: [{ maxLength: 130, minLength: 130 }, { $ref: "alphanumeric" }],
			type: "string",
		},
		/* eslint-enable sort-keys-fix/sort-keys-fix */
	},
	required: ["network", "gasPrice", "gasLimit", "value", "nonce", "data"],
	type: "object",
};

const transactionSigned: SchemaObject = {
	...transaction,
	$id: "transactionSigned",
	required: [...transaction.required, "v", "r", "s"],
};

const transactionStrict: SchemaObject = {
	...transactionSigned,
	$id: "transactionStrict",
	required: [...transactionSigned.required, "hash", "from", "senderPublicKey", "senderLegacyAddress"],
	unevaluatedProperties: false,
};

const transactions = {
	$id: "transactions",
	items: { $ref: "transactionSigned" },
	type: "array",
};

export const schemas = {
	networkByte,
	prefixedTransactionHash,
	transaction,
	transactionHash,
	transactionSigned,
	transactionStrict,
	transactions,
};
