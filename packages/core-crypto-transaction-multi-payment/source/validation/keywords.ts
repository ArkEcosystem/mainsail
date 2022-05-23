import { Contracts } from "@arkecosystem/core-contracts";
import { AnySchemaObject, FuncKeywordDefinition } from "ajv";

export const makeKeywords = (configuration: Contracts.Crypto.IConfiguration) => {
	const maxPaymentsLength: FuncKeywordDefinition = {
		compile: (schema: AnySchemaObject) => (data: any[]) =>
			data.length <= (configuration.getMilestone().multiPaymentLimit || 256),
		errors: false,
		keyword: "maxMultiPaymentLimit",
		type: "array",
	};

	return { maxPaymentsLength };
};
