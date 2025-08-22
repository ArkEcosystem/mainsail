import * as index from "./index";
import { describe } from "../../test-framework/source";

describe("Index", ({ assert, it }) => {
	it("should export ServiceProvider", () => {
		assert.defined(index.ServiceProvider);
	});
});
