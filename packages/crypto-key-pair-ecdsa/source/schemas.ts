export const schemas = {
	publicKey: {
		$id: "publicKey",
		allOf: [{ maxLength: 66, minLength: 66 }, { $ref: "hex" }],
		type: "string",
	},
};
