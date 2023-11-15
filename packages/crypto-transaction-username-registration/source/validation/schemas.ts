export const schemas = {
	username: {
		$id: "username",
		allOf: [
			{ pattern: "^[a-z0-9!@$&_.]+$", type: "string" },
			{ maxLength: 20, minLength: 1 },
			{ transform: ["toLowerCase"] },
		],
		type: "string",
	},
};
