import { homedir } from "os";
import { join } from "path";

import { describe } from "../../core-test-framework";
import { expandTilde } from "./expand-tilde";

describe("#expandTilde", ({ it, assert }) => {
	it("should not expand if the path is already absolute", function () {
		assert.equal(expandTilde("/home"), "/home");
	});

	it("should expand a tilde to the user home directory", function () {
		assert.equal(expandTilde("~"), homedir());
	});

	it("should expand `~+` to process.cwd, per bash spec", function () {
		assert.equal(expandTilde("~+"), process.cwd());
		assert.equal(expandTilde("~+/downloads"), join(process.cwd(), "downloads"));
	});
});
