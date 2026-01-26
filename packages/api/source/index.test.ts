import { describe } from "@mainsail/test-runner";
import * as index from "./index.js";

describe("Index", ({ it, assert }) => {
	it("should export CommandLineInterface", () => {
		assert.defined(index.CommandLineInterface);
	});
});
