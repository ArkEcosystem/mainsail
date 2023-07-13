import { headers } from "./headers";

export const postPrevote = {
	properties: {
		headers,
	},
	required: ["headers"],
	type: "object",
};
