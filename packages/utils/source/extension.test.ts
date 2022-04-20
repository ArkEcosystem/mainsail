import { describe } from "../../core-test-framework";
import { extension } from "./extension";

describe("#extension", ({ it, assert }) => {
	it("should return the file extension", () => {
		assert.equal(extension("file.html"), "html");
		assert.equal(extension("file.js"), "js");
		assert.equal(extension("file.ts"), "ts");
		assert.equal(extension("file.php"), "php");
		assert.equal(extension("file.rb"), "rb");
		assert.equal(extension("file.ext"), "ext");
		assert.undefined(extension(""));
	});
});
