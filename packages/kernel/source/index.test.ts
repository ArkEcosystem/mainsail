import * as index from "./index";
import { describe } from "@mainsail/test-runner";

describe("Index", ({ assert, it }) => {
	it("should export Application", () => {
		assert.defined(index.Application);
	});

	it("should export Bootstrap", () => {
		assert.defined(index.Bootstrap);
	});

	it("should export Environment", () => {
		assert.defined(index.Environment);
	});

	it("should export Ipc", () => {
		assert.defined(index.Ipc);
	});

	it("should export Providers", () => {
		assert.defined(index.Providers);
	});

	it("should export Services", () => {
		assert.defined(index.Services);
	});

	it("should export Services", () => {
		assert.defined(index.Support);
	});
});
