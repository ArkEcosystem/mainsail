import { describe } from "../../../../../core-test-framework";
import { NullCacheStore } from "./null";

describe("NullCacheStore", ({ assert, it }) => {
	it("should return instance back", async () => {
		const driver = new NullCacheStore<string, string>();
		const result = await driver.make();
		assert.is(result, driver);
	});

	it("should return empty array", async () => {
		const driver = new NullCacheStore<string, string>();
		const result = await driver.all();
		assert.equal(result, []);
	});

	it("should return empty array", async () => {
		const driver = new NullCacheStore<string, string>();
		const result = await driver.keys();
		assert.equal(result, []);
	});

	it("should return empty array", async () => {
		const driver = new NullCacheStore<string, string>();
		const result = await driver.values();
		assert.equal(result, []);
	});

	it("should return undefined", async () => {
		const driver = new NullCacheStore<string, string>();
		const result = await driver.get("key");
		assert.undefined(result);
	});

	it("should return array of undefined", async () => {
		const driver = new NullCacheStore<string, string>();
		const result = await driver.getMany(["key1", "key2"]);
		assert.equal(result, [undefined, undefined]);
	});

	it("should return false", async () => {
		const driver = new NullCacheStore<string, string>();
		const result = await driver.put("key", "value");
		assert.is(result, false);
	});

	it("should return array of false", async () => {
		const driver = new NullCacheStore<string, string>();
		const result = await driver.putMany([
			["key1", "value1"],
			["key2", "value2"],
		]);
		assert.equal(result, [false, false]);
	});

	it("should return false", async () => {
		const driver = new NullCacheStore<string, string>();
		const result = await driver.has("key");
		assert.is(result, false);
	});

	it("should return array of false", async () => {
		const driver = new NullCacheStore<string, string>();
		const result = await driver.hasMany(["key1", "key2"]);
		assert.equal(result, [false, false]);
	});

	it("should return true", async () => {
		const driver = new NullCacheStore<string, string>();
		const result = await driver.missing("key");
		assert.is(result, true);
	});

	it("should return array of true", async () => {
		const driver = new NullCacheStore<string, string>();
		const result = await driver.missingMany(["key1", "key2"]);
		assert.equal(result, [true, true]);
	});

	it("should return false", async () => {
		const driver = new NullCacheStore<string, string>();
		const result = await driver.forever("key", "value");
		assert.is(result, false);
	});

	it("should return array of false", async () => {
		const driver = new NullCacheStore<string, string>();
		const result = await driver.foreverMany([
			["key1", "value1"],
			["key2", "value2"],
		]);
		assert.equal(result, [false, false]);
	});

	it("should return false", async () => {
		const driver = new NullCacheStore<string, string>();
		const result = await driver.forget("key");
		assert.is(result, false);
	});

	it("should return array of false", async () => {
		const driver = new NullCacheStore<string, string>();
		const result = await driver.forgetMany(["key1", "key2"]);
		assert.equal(result, [false, false]);
	});

	it("should return false", async () => {
		const driver = new NullCacheStore<string, string>();
		const result = await driver.flush();
		assert.is(result, false);
	});

	it("should return empty string", async () => {
		const driver = new NullCacheStore<string, string>();
		const result = await driver.getPrefix();
		assert.is(result, "");
	});
});
