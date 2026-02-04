export const schemas = {
	consensusSignature: {
		$id: "consensusSignature",
		allOf: [{ $ref: "alphanumeric" }, { maxLength: 192, minLength: 192 }],
		type: "string",
	},
};
