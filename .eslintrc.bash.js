module.exports = {
	...require("./.eslintrc"),
	parserOptions: {
		project: "../../tsconfig.eslint.json",
		extraFileExtensions: [".json"],
		projectFolderIgnoreList: ["build", "coverage", "node_modules", "public"],
	},
};
