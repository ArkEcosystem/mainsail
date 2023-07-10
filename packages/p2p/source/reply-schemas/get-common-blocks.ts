import { headers } from "./headers";

export const getCommonBlocks = {
	additionalProperties: false,
	properties: {
		common: {
			anyOf: [
				{
					properties: {
						height: {
							minimum: 1,
							type: "integer",
						},
						id: { blockId: {} },
					},
					required: ["height", "id"],
					type: "object",
				},
				{
					type: "null",
				},
			],
		},
		headers,
	},
	required: ["headers", "common"],
	type: "object",
};
