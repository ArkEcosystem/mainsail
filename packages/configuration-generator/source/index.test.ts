import * as index from "./index";
import { describe } from "@mainsail/test-runner";

describe("Index", ({ assert, it }) => {
	it("should export makeApplication", () => {
		assert.defined(index.makeApplication);
	});

	it("should export ConfigurationGenerator", () => {
		assert.defined(index.ConfigurationGenerator);
	});

	it("should export ConfigurationWriter", () => {
		assert.defined(index.ConfigurationWriter);
	});

	it("should export Contracts", () => {
		assert.defined(index.Contracts);
	});

	it("should export Generators", () => {
		assert.defined(index.Generators);
	});

	it("should export Identifiers", () => {
		assert.defined(index.Identifiers);
	});
});
