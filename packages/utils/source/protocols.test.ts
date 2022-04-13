import { describe } from "../../core-test-framework";

import { protocols } from "./protocols";

describe("protocols", async ({ assert, it, nock, loader }) => {
	it("should return all protocols of the given URL", () => {
		assert.equal(protocols("git+ssh://git@host.com/owner/repo"), ["git", "ssh"]);
		assert.equal(protocols("http://google.com/"), ["http"]);
		assert.equal(protocols("https://google.com/"), ["https"]);
	});
});
