import * as index from "./index";
import { describe } from "@mainsail/test-runner";

describe("Index", ({ assert, it }) => {
	it("should export ServiceProvider", () => {
		assert.defined(index.ServiceProvider);
	});

	it("should export Mempool", () => {
		assert.defined(index.Mempool);
	});

	it("should export Processor", () => {
		assert.defined(index.Processor);
	});

	it("should export Query", () => {
		assert.defined(index.Query);
	});

	it("should export SenderMempool", () => {
		assert.defined(index.SenderMempool);
	});

	it("should export SenderState", () => {
		assert.defined(index.SenderState);
	});

	it("should export Service", () => {
		assert.defined(index.Service);
	});

	it("should export Storage", () => {
		assert.defined(index.Storage);
	});
});
