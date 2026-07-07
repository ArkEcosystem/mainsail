// Mirrors this package's identity (see package.json) so tests run commands under
// the real "@mainsail/api" identity instead of the Console default "@mainsail/core".
export const apiPackageJson = {
	bin: {
		"mainsail-api": "./bin/run.js",
	},
	description: "API of the Mainsail Blockchain",
	name: "@mainsail/api",
	version: "3.0.0-next.0",
};
