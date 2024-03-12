import { describe } from "../../test-framework/source";
import { words } from "./words";

describe("words", async ({ assert, it, nock, loader }) => {
	it("should work with words", () => {
		assert.equal(words("fred, barney, & pebbles"), ["fred", "barney", "pebbles"]);
	});
});
