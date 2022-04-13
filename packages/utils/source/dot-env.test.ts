/* eslint-disable unicorn/prevent-abbreviations */
import { describe } from "../../core-test-framework";
import { resolve } from "path";

import { dotenv } from "./dot-env";

describe("#DotEnv", ({ it, assert }) => {
	it("should parse the given string", () => {
		assert.equal(dotenv.parse("key=value"), { key: "value" });
		assert.equal(dotenv.parse("key=1"), { key: 1 });
		assert.equal(dotenv.parse('key="1"'), { key: 1 });
		assert.equal(dotenv.parse('key="true"'), { key: true });
		assert.equal(dotenv.parse("key=true"), { key: true });
		assert.equal(dotenv.parse('key="false"'), { key: false });
		assert.equal(dotenv.parse("key=false"), { key: false });
		assert.equal(dotenv.parse("key="), {});
		assert.equal(dotenv.parse("=value"), {});
		assert.equal(dotenv.parse(""), {});
	});

	it("should parse the given file", () => {
		assert.equal(dotenv.parseFile(resolve(__dirname, "../test/fixtures/.env")), {
			key1: "value",
			key2: 1,
			key3: 1,
			key4: true,
			key5: true,
			key6: false,
			key7: false,
		});
	});

	it("should stringify the given object", () => {
		assert.equal(dotenv.stringify({ key: "value" }), 'key="value"');
		assert.equal(dotenv.stringify({ key: 1 }), "key=1");
		assert.equal(dotenv.stringify({ key: true }), "key=true");
		assert.equal(dotenv.stringify({ [""]: true }), "");
	});
});
