import { expandTilde } from "./expand-tilde";
import { homedir } from "os";
import { join } from "path";

describe("#expandTilde", () => {
	it("should not expand if the path is already absolute", function () {
		expect(expandTilde("/home")).toBe("/home");
	});

	it("should expand a tilde to the user home directory", function () {
		expect(expandTilde("~")).toBe(homedir());
	});

	it("should expand `~+` to process.cwd, per bash spec", function () {
		expect(expandTilde("~+")).toBe(process.cwd());
		expect(expandTilde("~+/downloads")).toBe(join(process.cwd(), "downloads"));
	});
});
