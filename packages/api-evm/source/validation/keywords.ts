import type { Contracts } from "@mainsail/contracts";
import type { FuncKeywordDefinition } from "ajv";

export const makeKeywords = (stateStore: Contracts.State.Store): { currentHeight: FuncKeywordDefinition } => {
	const currentHeight: FuncKeywordDefinition = {
		compile: (schema) => (data) => Number(data) === stateStore.getBlockNumber(),
		errors: false,
		keyword: "currentHeightHex",
		metaSchema: {
			type: "boolean",
		},
	};

	return { currentHeight };
};
