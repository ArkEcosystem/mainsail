export const schemas = {
	address: {
		$id: "address",
		allOf: [
			{
				maxLength: 34,
				minLength: 34,
				pattern: "^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$",
			},
		],
		type: "string",
	},
};
