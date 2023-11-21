export const schemas = {
	username: {
		$id: "username",
		allOf: [
			{ pattern: "^[a-z0-9_]+$", type: "string" },
			{ maxLength: 20, minLength: 1 },
		],
		type: "string",
	},
};
