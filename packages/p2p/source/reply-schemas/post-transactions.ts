import { headers } from "./headers";

export const postTransactions = {
	properties: {
		accept: {
			items: {
				$ref: "transactionId",
			},
			type: "array",
		},
		headers,
	},
	required: ["headers", "accept"],
	type: "object",
};
