import { Contracts } from "@arkecosystem/core-contracts";
import deepmerge from "deepmerge";

const signedTransaction = {
	anyOf: [
		{ required: ["id", "signature"] },
		{ required: ["id", "signature", "signatures"] },
		{ required: ["id", "signatures"] },
	],
};

const strictTransaction = {
	unevaluatedProperties: false,
};

export const extendSchema = (parent, properties): Contracts.Crypto.ITransactionSchema => deepmerge(parent, properties);

export const signedSchema = (schema: Contracts.Crypto.ITransactionSchema): Contracts.Crypto.ITransactionSchema => {
	const signed = extendSchema(schema, signedTransaction);
	signed.$id = `${schema.$id}Signed`;
	return signed;
};

export const strictSchema = (schema: Contracts.Crypto.ITransactionSchema): Contracts.Crypto.ITransactionSchema => {
	const signed = signedSchema(schema);
	const strict = extendSchema(signed, strictTransaction);
	strict.$id = `${schema.$id}Strict`;
	return strict;
};
