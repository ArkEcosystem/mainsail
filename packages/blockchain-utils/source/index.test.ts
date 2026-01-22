import * as index from "./index";
import { describe } from "@mainsail/test-framework";

describe("Index", ({ assert, it }) => {
	it("should export ServiceProvider", () => {
		assert.defined(index.ServiceProvider);
	});
});
