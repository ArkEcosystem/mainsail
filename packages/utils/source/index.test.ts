import { describe } from "@mainsail/test-runner";
import * as utils from "./index";

describe("index", ({ assert, it }) => {
	it("should export all functions and classes", () => {
		for (const name of [
			"ByteBuffer",
			"HttpError",
			"Lock",
			"camelCase",
			"chunk",
			"cloneDeep",
			"comparator",
			"ensureError",
			"expandTilde",
			"formatEcdsaSignature",
			"get",
			"getPathSegments",
			"groupBy",
			"has",
			"isArray",
			"isBlacklisted",
			"isEmpty",
			"isEnumerable",
			"isObject",
			"isString",
			"isWhitelisted",
			"map",
			"mapArray",
			"mapObject",
			"merge",
			"minBy",
			"orderBy",
			"pascalCase",
			"pluralize",
			"prettyBytes",
			"prettyTime",
			"randomNumber",
			"set",
			"setTimeoutAsync",
			"shuffle",
			"sleep",
			"take",
			"unset",
			"validatorSetPack",
			"validatorSetUnpack",
		]) {
			assert.function(utils[name]);
		}
	});

	it("should export all namespaces", () => {
		for (const name of ["IpAddress", "assert", "dotenv", "http", "semver"]) {
			assert.object(utils[name]);
		}
	});

	it("should not export anything else", () => {
		assert.equal(Object.keys(utils).length, 45);
	});
});
