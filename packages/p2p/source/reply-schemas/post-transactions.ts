import { headers } from "./headers.js";

export const postTransactions = {
	properties: {
		accept: {
			items: {
				type: "number",
			},
			type: "array",
			uniqueItems: true,
		},
		headers,
	},
	required: ["headers", "accept"],
	type: "object",
};
