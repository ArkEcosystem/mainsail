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
	$id: undefined,
	properties: {
		amount: { bignumber: { bypassGenesis: true, minimum: 1 } },
		fee: { bignumber: { bypassGenesis: true, minimum: 0 } },
		id: { anyOf: [{ $ref: "transactionId" }, { type: "null" }] },
		network: { $ref: "networkByte" },
		nonce: { bignumber: { minimum: 0 } },
		senderPublicKey: { $ref: "publicKey" },
		signature: { $ref: "alphanumeric" },
		signatures: {
			items: { allOf: [{ maxLength: 130, minLength: 130 }, { $ref: "alphanumeric" }], type: "string" },
			maxItems: 16,
			minItems: 1,
			type: "array",
			uniqueItems: true,
		},
		typeGroup: { minimum: 0, type: "integer" },
		version: { enum: [1] },
	},
	required: ["type", "senderPublicKey", "fee", "amount", "nonce"],
	type: "object",
};
