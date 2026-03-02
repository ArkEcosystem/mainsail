import * as index from "./index";
import { describe } from "@mainsail/test-runner";

describe("Index", ({ assert, it }) => {
	it("should export ServiceProvider", () => {
		assert.defined(index.ServiceProvider);
	});

	it("should export KeyPairFactory", () => {
		assert.defined(index.KeyPairFactory);
	});

	it("should export schemas", () => {
		assert.defined(index.schemas);
	});
});
