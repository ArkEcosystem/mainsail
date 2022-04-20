import { describe } from "../../core-test-framework";
import { trimTrailingSlash } from "./trim-trailing-slash";

describe("trimTrailingSlash", async ({ assert, it, nock, loader }) => {
	it("should remove all trailing slashes", () => {
		assert.is(trimTrailingSlash("/owner/path"), "/owner/path");
		assert.is(trimTrailingSlash("/owner/path/"), "/owner/path");
		assert.is(trimTrailingSlash("/owner/path//"), "/owner/path");
		assert.is(trimTrailingSlash("/owner/path//"), "/owner/path");
		assert.is(trimTrailingSlash("/owner/path///"), "/owner/path");
	});
});
