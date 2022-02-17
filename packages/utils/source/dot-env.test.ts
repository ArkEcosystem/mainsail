import "jest-extended";

import { dotenv } from "./dot-env";
import { resolve } from "path";

describe("#DotEnv", () => {
	it("should parse the given string", () => {
		expect(dotenv.parse("key=value")).toEqual({ key: "value" });
		expect(dotenv.parse("key=1")).toEqual({ key: 1 });
		expect(dotenv.parse('key="1"')).toEqual({ key: 1 });
		expect(dotenv.parse('key="true"')).toEqual({ key: true });
		expect(dotenv.parse("key=true")).toEqual({ key: true });
		expect(dotenv.parse('key="false"')).toEqual({ key: false });
		expect(dotenv.parse("key=false")).toEqual({ key: false });
		expect(dotenv.parse("key=")).toEqual({});
		expect(dotenv.parse("=value")).toEqual({});
		expect(dotenv.parse("")).toEqual({});
	});

	it("should parse the given file", () => {
		expect(dotenv.parseFile(resolve(__dirname, "../test/fixtures/.env"))).toEqual({
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
		expect(dotenv.stringify({ key: "value" })).toBe('key="value"');
		expect(dotenv.stringify({ key: 1 })).toBe("key=1");
		expect(dotenv.stringify({ key: true })).toBe("key=true");
		expect(dotenv.stringify({ [""]: true })).toBe("");
	});
});
