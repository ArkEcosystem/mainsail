import * as index from "./index";
import { describe } from "@mainsail/test-runner";

describe("Index", ({ assert, it }) => {
	it("should export CommandLineInterface", () => {
		assert.defined(index.CommandLineInterface);
	});
});
