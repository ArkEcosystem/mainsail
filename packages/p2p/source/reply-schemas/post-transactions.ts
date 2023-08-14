import { headers } from "./headers";

export const postTransactions = {
	properties: {
		accept: {
			items: {
				pattern: "^[0123456789]+$",
				type: "string",
			},
			uniqueItems: true,
			type: "array",
		},
		headers,
	},
	required: ["headers", "accept"],
	type: "object",
};
