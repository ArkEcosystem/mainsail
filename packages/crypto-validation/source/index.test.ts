import * as index from "./index";
import { describe } from "@mainsail/test-runner";

describe("Index", ({ assert, it }) => {
	it("should export ServiceProvider", () => {
		assert.defined(index.ServiceProvider);
	});

	it("should export schemas", () => {
		assert.defined(index.schemas);
	});

	it("should export makeKeywords", () => {
		assert.defined(index.makeKeywords);
	});
});
