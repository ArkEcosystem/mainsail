import { FuncKeywordDefinition } from "ajv";

export const makeKeywords = () => {
	const minVotesUnvotesLength: FuncKeywordDefinition = {
		compile: (schema: number) => (data: { unvotes: string[]; votes: string[] }) =>
			data.unvotes.length + data.votes.length >= schema,
		errors: false,
		keyword: "minVotesUnvotesLength",
		metaSchema: {
			minimum: 0,
			type: "integer",
		},
		type: "object",
	};

	return { minVotesUnvotesLength };
};
