import * as index from "./index";
import { describe } from "./describe";

describe("Index", ({ assert, it }) => {
	it("should export describe", () => {
		assert.defined(index.describe);
	});

	it("should export describeEach", () => {
		assert.defined(index.describeEach);
	});

	it("should export describeSkip", () => {
		assert.defined(index.describeSkip);
	});

	it("should export describeWithContext", () => {
		assert.defined(index.describeWithContext);
	});

	it("should export assert", () => {
		assert.defined(index.assert);
	});

	it("should export Contracts", () => {
		assert.defined(index.Contracts);
	});

	it("should export loader", () => {
		assert.defined(index.loader);
	});
});
