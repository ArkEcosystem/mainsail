import { Contracts } from "@mainsail/contracts";
import { FuncKeywordDefinition } from "ajv";

export const makeKeywords = (configuration: Contracts.Crypto.IConfiguration) => {
	const limitToActiveValidators: FuncKeywordDefinition = {
		compile(schema) {
			return (data) => {
				const { activeValidators } = configuration.getMilestone();
				if (!Array.isArray(data)) {
					return false;
				}

				const minimum = typeof schema.minimum !== "undefined" ? schema.minimum : activeValidators;

				if (data.length < minimum || data.length > activeValidators) {
					return false;
				}

				return true;
			};
		},
		errors: false,
		keyword: "limitToActiveValidators",
		metaSchema: {
			properties: {
				minimum: { type: "integer" },
			},
			type: "object",
		},
	};

	const isValidatorIndex: FuncKeywordDefinition = {
		compile() {
			return (data) => {
				const { activeValidators } = configuration.getMilestone();

				if (!Number.isInteger(data)) {
					return false;
				}

				return data >= 0 && data < activeValidators;
			};
		},
		errors: false,
		keyword: "isValidatorIndex",
		metaSchema: {
			type: "object",
		},
	};

	return {
		isValidatorIndex,
		limitToActiveValidators,
	};
};
