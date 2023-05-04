export const schemas = {
	address: {
		$id: "address",
		allOf: [
			{
				$ref: "alphanumeric",
				maxLength: 62,
				minLength: 62,
			},
		],
		type: "string",
	},
};
