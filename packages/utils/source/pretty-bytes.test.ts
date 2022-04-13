import { describe } from "../../core-test-framework";

import { prettyBytes } from "./pretty-bytes";

describe("prettyBytes", async ({ assert, it, nock, loader }) => {
	it("should format the given number", () => {
		assert.is(prettyBytes(0), "0 B");
		assert.is(prettyBytes(0.4), "0.4 B");
		assert.is(prettyBytes(0.7), "0.7 B");
		assert.is(prettyBytes(10), "10 B");
		assert.is(prettyBytes(10.1), "10.1 B");
		assert.is(prettyBytes(999), "999 B");
		assert.is(prettyBytes(1001), "1 kB");
		assert.is(prettyBytes(1001), "1 kB");
		assert.is(prettyBytes(1e16), "10 PB");
		assert.is(prettyBytes(1e30), "1,000,000 YB");
	});
});
