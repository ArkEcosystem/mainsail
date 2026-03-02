import * as index from "./index";
import { describe } from "@mainsail/test-runner";

describe("Index", ({ assert, it }) => {
	it("should export Generator", () => {
		assert.defined(index.Generator);
	});

	it("should export Interfaces", () => {
		assert.defined(index.Interfaces);
	});
});
