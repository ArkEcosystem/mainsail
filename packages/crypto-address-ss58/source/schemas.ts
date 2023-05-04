export const schemas = {
	address: {
		$id: "address",
		allOf: [
			{
				maxLength: 48,
				minLength: 48,
				pattern: "^[0123456789a-zA-Z]+$",
			},
		],
		type: "string",
	},
};
