import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

import { describe } from "./describe";

describe<{
	directory: string;
}>("loader", ({ afterEach, assert, beforeEach, it, loader }) => {
	beforeEach((context) => {
		context.directory = mkdtempSync(join(tmpdir(), "test-runner-loader-"));
	});

	afterEach(({ directory }) => {
		rmSync(directory, { force: true, recursive: true });
	});

	it("json - should parse a JSON file", ({ directory }) => {
		const path = join(directory, "data.json");
		writeFileSync(path, JSON.stringify({ hello: "world", nested: { a: [1, 2] } }));

		assert.equal(loader.json(path), { hello: "world", nested: { a: [1, 2] } });
	});

	it("json - should throw for a missing file", ({ directory }) => {
		assert.throws(() => loader.json(join(directory, "missing.json")), "ENOENT");
	});

	it("json - should throw for invalid JSON", ({ directory }) => {
		const path = join(directory, "invalid.json");
		writeFileSync(path, "not json");

		assert.throws(() => loader.json(path), SyntaxError);
	});
});
