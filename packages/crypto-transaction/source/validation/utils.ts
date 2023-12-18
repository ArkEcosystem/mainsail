import { Contracts } from "@mainsail/contracts";
import { merge } from "@mainsail/utils";

const strictTransaction = {
	unevaluatedProperties: false,
};

export const extendSchema = (parent, properties): Contracts.Crypto.TransactionSchema =>
	merge(parent, properties, {
		arrayMerge(target, source, options) {
			const result = source;

			for (const item of target) {
				if (!result.includes(item)) {
					result.push(item);
				}
			}

			return result;
		},
	});

export const signedSchema = (schema: Contracts.Crypto.TransactionSchema): Contracts.Crypto.TransactionSchema => {
	const schemaToExtend = {
		properties: schema.properties,
		required: schema.required,
	};

	return {
		$id: `${schema.$id}Signed`,
		anyOf: [
			extendSchema(schemaToExtend, { required: ["id", "signature"] }),
			extendSchema(schemaToExtend, { required: ["id", "signature", "signatures"] }),
			extendSchema(schemaToExtend, { required: ["id", "signatures"] }),
		],
		type: "object",
	};
};

export const strictSchema = (schema: Contracts.Crypto.TransactionSchema): Contracts.Crypto.TransactionSchema => {
	const signed = signedSchema(schema);
	const strict = extendSchema(signed, strictTransaction);
	strict.$id = `${schema.$id}Strict`;
	return strict;
};
