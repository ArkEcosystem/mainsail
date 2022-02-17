import { extension } from "./extension";

describe("#extension", () => {
	it("should return the file extension", () => {
		expect(extension("file.html")).toBe("html");
		expect(extension("file.js")).toBe("js");
		expect(extension("file.ts")).toBe("ts");
		expect(extension("file.php")).toBe("php");
		expect(extension("file.rb")).toBe("rb");
		expect(extension("file.ext")).toBe("ext");
		expect(extension("")).toBeUndefined();
	});
});
