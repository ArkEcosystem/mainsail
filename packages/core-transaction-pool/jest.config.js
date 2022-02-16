module.exports = {
    testEnvironment: "node",
    bail: false,
    verbose: true,
    transform: {
        "^.+\\.tsx?$": "ts-jest",
    },
    testMatch: ["**/*.test.ts"],
    moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
    moduleNameMapper: {
        "@packages/(.*)$": "<rootDir>/../../packages/$1",
        "@tests/(.*)$": "<rootDir>/../../__tests__/$1",
    },
    watchman: false,
    setupFilesAfterEnv: ["jest-extended"],
};
