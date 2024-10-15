import { SchemaObject } from "ajv";

const transactionId: SchemaObject = {
	$id: "transactionId",
	allOf: [{ maxLength: 64, minLength: 64 }, { $ref: "hex" }],
	type: "string",
};

const networkByte: SchemaObject = {
	$id: "networkByte",
	network: true,
};

export const schemas = {
	networkByte,
	transactionId,
};

export const transactionBaseSchema: SchemaObject = {
	properties: {
		gasLimit: { transactionGasLimit: {} },
		gasPrice: { bignumber: { minimum: 0 } },
		id: { anyOf: [{ $ref: "transactionId" }, { type: "null" }] },
		network: { $ref: "networkByte" },
		nonce: { bignumber: { minimum: 0 } },
		senderAddress: { $ref: "address" },
		senderPublicKey: { $ref: "publicKey" },
		signature: { allOf: [{ maxLength: 130, minLength: 130 }, { $ref: "alphanumeric" }], type: "string" },
		value: { bignumber: { maximum: undefined, minimum: 0 } },
		// signatures: {
		// 	items: { allOf: [{ maxLength: 130, minLength: 130 }, { $ref: "alphanumeric" }], type: "string" },
		// 	maxItems: 16,
		// 	minItems: 1,
		// 	type: "array",
		// 	uniqueItems: true,
		// },
	},
	required: ["senderAddress", "senderPublicKey", "gasPrice", "gasLimit", "value", "nonce"],
	type: "object",
};
