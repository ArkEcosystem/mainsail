import { FuncKeywordDefinition } from "ajv";

export const makeKeywords = () => {
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
