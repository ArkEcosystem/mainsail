import { Contracts } from "@mainsail/contracts";
import { FuncKeywordDefinition } from "ajv";

export const makeKeywords = (configuration: Contracts.Crypto.IConfiguration) => {
	const isValidatorBitmap: FuncKeywordDefinition = {
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

				return data.every((element: any) => typeof element === "boolean");
			};
		},
		errors: false,
		keyword: "isValidatorBitmap",
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
		isValidatorBitmap,
		isValidatorIndex,
	};
};
