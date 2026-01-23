import { describe } from "@mainsail/test-runner";
import * as Index from "./index.js";

describe("Index", ({ it, assert }) => {
	it("should export CommandLineInterface", () => {
		assert.defined(Index.CommandLineInterface);
	});
});
