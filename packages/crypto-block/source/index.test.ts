import * as index from "./index";
import { describe } from "@mainsail/test-runner";

describe("Index", ({ assert, it }) => {
	it("should export ServiceProvider", () => {
		assert.defined(index.ServiceProvider);
	});

	it("should export schemas", () => {
		assert.defined(index.schemas);
	});

	it("should export Serializer", () => {
		assert.defined(index.Serializer);
	});

	it("should export Deserializer", () => {
		assert.defined(index.Deserializer);
	});

	it("should export HashFactory", () => {
		assert.defined(index.HashFactory);
	});

	it("should export BlockFactory", () => {
		assert.defined(index.BlockFactory);
	});
});
