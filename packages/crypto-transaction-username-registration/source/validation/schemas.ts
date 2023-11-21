export const schemas = {
	username: {
		$id: "username",
		allOf: [
			{ pattern: "^(?!_)(?!.*_$)(?!.*__)[a-z0-9_]+$", type: "string" }, // Allow only lowercase letters, numbers and underscores, underscores can be used only once in a row and not at the beginning or end of the string
			{ maxLength: 20, minLength: 1 },
		],
		type: "string",
	},
};
