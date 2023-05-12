export const schemas = {
	publicKey: {
		$id: "publicKey",
		allOf: [{ maxLength: 96, minLength: 96 }, { $ref: "hex" }],
		type: "string",
	},
};
