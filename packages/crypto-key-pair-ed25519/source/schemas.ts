export const schemas = {
	publicKey: {
		$id: "publicKey",
		allOf: [{ maxLength: 64, minLength: 64 }, { $ref: "hex" }],
		type: "string",
	},
};
