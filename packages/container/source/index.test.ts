import * as index from "./index";
import { describe } from "@mainsail/test-runner";

describe("Index", ({ assert, it }) => {
	it("should export Application", () => {
		assert.defined(index.Application);
	});

	it("should export Container", () => {
		assert.defined(index.Container);
	});
});
