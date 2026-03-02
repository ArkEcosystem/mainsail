export const schemas = {
	consensusSignature: {
		$id: "consensusSignature",
		allOf: [{ $ref: "hex" }, { maxLength: 192, minLength: 192 }],
		type: "string",
	},
};
