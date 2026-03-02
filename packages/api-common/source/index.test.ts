import * as index from "./index";
import { describe } from "@mainsail/test-runner";

describe("Index", ({ it, assert }) => {
	it("should export Plugins", () => {
		assert.defined(index.Plugins);
	});

	it("should export Schemas", () => {
		assert.defined(index.Schemas);
	});

	it("should export Validation", () => {
		assert.defined(index.Validation);
	});

	it("should export AbstractServiceProvider", () => {
		assert.defined(index.AbstractServiceProvider);
	});

	it("should export AbstractController", () => {
		assert.defined(index.AbstractController);
	});

	it("should export AbstractServer", () => {
		assert.defined(index.AbstractServer);
	});
});
