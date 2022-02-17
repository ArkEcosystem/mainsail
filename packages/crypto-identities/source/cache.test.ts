import "jest-extended";

import { Cache } from "./cache";
let cache: Cache<string, string>;

describe("Cache", () => {
	beforeEach(() => {
		cache = new Cache<string, string>(10);
	});

	describe("has", () => {
		it("should return false if key is not set", () => {
			expect(cache.has("unset key")).toBeFalse();
		});

		it("should return true if key is set", () => {
			cache.set("key", "value");

			expect(cache.has("key")).toBeTrue();
		});
	});

	describe("get", () => {
		it("should return undefined if key is not set", () => {
			expect(cache.get("unset key")).toBeUndefined();
		});

		it("should return value if key is set", () => {
			cache.set("key", "value");

			expect(cache.get("key")).toEqual("value");
		});
	});

	describe("set", () => {
		it("should remove elements by insertion order, when length is exceeded", () => {
			for (let i = 0; i < 10; i++) {
				cache.set(i.toString(), i.toString());
			}

			expect(cache.has("0")).toBeTrue();

			cache.set("10", "10");

			expect(cache.has("0")).toBeFalse();
		});
	});
});
