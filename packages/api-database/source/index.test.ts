import * as index from "./index";
import { describe } from "@mainsail/test-runner";

describe("Index", ({ it, assert }) => {
	it("should export Contracts", () => {
		assert.defined(index.Contracts);
	});

	it("should export Identifiers", () => {
		assert.defined(index.Identifiers);
	});

	it("should export Models", () => {
		assert.defined(index.Models);
	});

	it("should export Repositories", () => {
		assert.defined(index.Repositories);
	});

	it("should export Search", () => {
		assert.defined(index.Search);
	});

	it("should export Pg", () => {
		assert.defined(index.Pg);
	});

	it("should export TypeOrm", () => {
		assert.defined(index.TypeOrm);
	});

	it("should export ServiceProvider", () => {
		assert.defined(index.ServiceProvider);
	});
});
