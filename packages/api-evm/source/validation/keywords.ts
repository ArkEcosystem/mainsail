import { Contracts } from "@mainsail/contracts";
import { FuncKeywordDefinition } from "ajv";

export const makeKeywords = (stateStore: Contracts.State.Store) => {
	const currentHeight: FuncKeywordDefinition = {
		compile: (schema) => (data) => Number(data) === stateStore.getHeight(),
		errors: false,
		keyword: "currentHeightHex",
		metaSchema: {
			type: "boolean",
		},
	};

	return { currentHeight };
};
