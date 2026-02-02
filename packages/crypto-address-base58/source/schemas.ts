export const schemas = {
	legacyAddress: {
		$id: "legacyAddress",
		allOf: [
			{
				maxLength: 34,
				minLength: 33,
				pattern: "^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$",
			},
		],
		type: "string",
	},
};
