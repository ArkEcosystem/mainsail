import deepmerge from "deepmerge";

const signedTransaction = {
	anyOf: [
		{ required: ["id", "signature"] },
		{ required: ["id", "signature", "signatures"] },
		{ required: ["id", "signatures"] },
	],
};

const strictTransaction = {
	additionalProperties: false,
};

export const transactionBaseSchema: Record<string, any> = {
	$id: undefined,
	else: { required: ["type", "senderPublicKey", "fee", "amount", "nonce"] },
	if: { properties: { version: { anyOf: [{ type: "null" }, { const: 1 }] } } },
	properties: {
		amount: { bignumber: { bypassGenesis: true, minimum: 1 } },
		fee: { bignumber: { bypassGenesis: true, minimum: 0 } },
		id: { anyOf: [{ $ref: "transactionId" }, { type: "null" }] },
		network: { $ref: "networkByte" },
		nonce: { bignumber: { minimum: 0 } },
		senderPublicKey: { $ref: "publicKey" },
		signature: { $ref: "alphanumeric" },
		signatures: {
			additionalItems: false,
			items: { allOf: [{ maxLength: 130, minLength: 130 }, { $ref: "alphanumeric" }] },
			maxItems: 16,
			minItems: 1,
			type: "array",
			uniqueItems: true,
		},
		typeGroup: { minimum: 0, type: "integer" },
		version: { enum: [1] },
	},
	then: { required: ["type", "senderPublicKey", "fee", "amount", "timestamp"] },
	type: "object",
};

export const extend = (parent, properties): TransactionSchema => deepmerge(parent, properties);

export const signedSchema = (schema: TransactionSchema): TransactionSchema => {
	const signed = extend(schema, signedTransaction);
	signed.$id = `${schema.$id}Signed`;
	return signed;
};

export const strictSchema = (schema: TransactionSchema): TransactionSchema => {
	const signed = signedSchema(schema);
	const strict = extend(signed, strictTransaction);
	strict.$id = `${schema.$id}Strict`;
	return strict;
};

export type TransactionSchema = Record<string, any>;
