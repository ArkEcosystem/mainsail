import * as index from "./index";
import { describe } from "@mainsail/test-runner";

describe("Index", ({ assert, it }) => {
	it("should export BuildPackages", () => {
		assert.defined(index.BuildPackages);
	});

	it("should export Channels", () => {
		assert.defined(index.Channels);
	});

	it("should export Enums", () => {
		assert.defined(index.Enums);
	});

	it("should export EnvironmentVariables", () => {
		assert.defined(index.EnvironmentVariables);
		assert.defined(index.EnvironmentVariableNames);
	});

	it("should export Events", () => {
		assert.defined(index.Events);
	});

	it("should export Identifiers", () => {
		assert.defined(index.Identifiers);
	});

	it("should export Locale", () => {
		assert.defined(index.Locale);
	});

	it("should export LogLevels", () => {
		assert.defined(index.LogLevels);
	});

	it("should export Units", () => {
		assert.defined(index.Units);
	});
});
