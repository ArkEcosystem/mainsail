export const schemas = {
	publicKey: {
		$id: "consensusPublicKey",
		allOf: [{ maxLength: 96, minLength: 96 }, { $ref: "hex" }],
		type: "string",
	},
};
