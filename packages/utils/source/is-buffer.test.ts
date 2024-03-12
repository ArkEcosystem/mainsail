import { describe } from "../../test-framework/source";
import { isBuffer } from "./is-buffer";

describe("isBuffer", async ({ assert, it, nock, loader }) => {
	it("should pass", () => {
		assert.true(isBuffer(Buffer.alloc(1)));
	});

	it("should fail", () => {
		assert.false(isBuffer(1));
	});
});
