import { SchemaObject } from "ajv";

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

export const schemas = {
	networkByte,
	prefixedTransactionHash,
	transactionHash,
};
