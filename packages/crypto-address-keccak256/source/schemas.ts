export const schemas = {
	address: {
		$id: "address",
		allOf: [
			{
				maxLength: 42,
				minLength: 42,
				pattern: "^0x[0123456789a-fA-F]+$",
			},
		],
		type: "string",
	},
};
