import { Contracts } from "@mainsail/contracts";
import deepmerge from "deepmerge";

const strictTransaction = {
	unevaluatedProperties: false,
};

export const extendSchema = (parent, properties): Contracts.Crypto.ITransactionSchema => deepmerge(parent, properties);

export const signedSchema = (schema: Contracts.Crypto.ITransactionSchema): Contracts.Crypto.ITransactionSchema => ({
	$id: `${schema.$id}Signed`,
	anyOf: [
		extendSchema({ properties: schema.properties, required: schema.required }, { required: ["id", "signature"] }),
		extendSchema(
			{ properties: schema.properties, required: schema.required },
			{ required: ["id", "signature", "signatures"] },
		),
		extendSchema({ properties: schema.properties, required: schema.required }, { required: ["id", "signatures"] }),
	],
	type: "object",
});

export const strictSchema = (schema: Contracts.Crypto.ITransactionSchema): Contracts.Crypto.ITransactionSchema => {
	const signed = signedSchema(schema);
	const strict = extendSchema(signed, strictTransaction);
	strict.$id = `${schema.$id}Strict`;
	return strict;
};
