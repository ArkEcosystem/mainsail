import * as index from "./index";
import { describe } from "@mainsail/test-runner";

describe("Index", ({ assert, it }) => {
	it("should export ServiceProvider", () => {
		assert.defined(index.ServiceProvider);
	});

	it("should export BlockForger", () => {
		assert.defined(index.BlockForger);
	});

	it("should export TransactionForger", () => {
		assert.defined(index.TransactionForger);
	});
});
