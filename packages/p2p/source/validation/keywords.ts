import type { FuncKeywordDefinition } from "ajv";

export const makeKeywords = (): { buffer: FuncKeywordDefinition } => {
	const buffer: FuncKeywordDefinition = {
		compile() {
			return (data) => Buffer.isBuffer(data);
		},
		errors: false,
		keyword: "buffer",
		metaSchema: {
			type: "object",
		},
	};

	return { buffer };
};
