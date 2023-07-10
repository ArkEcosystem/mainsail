import { Contracts } from "@mainsail/contracts";
import { merge } from "@mainsail/utils";

const strictTransaction = {
	unevaluatedProperties: false,
};

export const extendSchema = (parent, properties): Contracts.Crypto.ITransactionSchema =>
	merge(parent, properties, {
		arrayMerge(target, source, options) {
			const result = target;

			for (const item of source) {
				if (!result.includes(item)) {
					result.push(item);
				}
			}

			return result;
		},
	});

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
