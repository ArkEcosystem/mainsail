module.exports = {
	collectCoverage: true,
	collectCoverageFrom: [
		"source/**/*.ts",
		"!source/contracts.ts",
		"!source/errors.ts",
		"!source/index.ts",
		"!**/node_modules/**",
	],
	coverageDirectory: "<rootDir>/.coverage",
	coverageReporters: ["json", "lcov", "text", "clover", "html"],
	moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
	setupFilesAfterEnv: ["jest-extended"],
	testEnvironment: "node",
	testMatch: ["**/*.test.ts"],
	transform: {
		"^.+\\.tsx?$": "ts-jest",
	},
	globals: {
		"ts-jest": {
			packageJson: "./package.json",
		},
	},
	coverageThreshold: {
		global: {
			branches: 100,
			functions: 100,
			lines: 100,
			statements: 100,
		},
	},
};
