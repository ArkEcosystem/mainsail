import { describe } from "../../../../../core-test-framework";

import { NullFilesystem } from "./null";

describe("NullFilesystem", ({ assert, it }) => {
	it("should return instance itself", async () => {
		const driver = new NullFilesystem();
		const result = await driver.make();
		assert.is(result, driver);
	});

	it("should return false", async () => {
		const driver = new NullFilesystem();
		const result = await driver.exists("filename");
		assert.false(result);
	});

	it("should return empty buffer", async () => {
		const driver = new NullFilesystem();
		const result = await driver.get("filename");
		assert.equal(result, new Buffer(0));
	});

	it("should return false", async () => {
		const driver = new NullFilesystem();
		const result = await driver.put("filename", "contents");
		assert.false(result);
	});

	it("should return false", async () => {
		const driver = new NullFilesystem();
		const result = await driver.delete("filename");
		assert.false(result);
	});

	it("should return false", async () => {
		const driver = new NullFilesystem();
		const result = await driver.copy("filename1", "filename2");
		assert.false(result);
	});

	it("should return false", async () => {
		const driver = new NullFilesystem();
		const result = await driver.move("filename1", "filename2");
		assert.false(result);
	});

	it("should return 0", async () => {
		const driver = new NullFilesystem();
		const result = await driver.size("filename");
		assert.is(result, 0);
	});

	it("should return 0", async () => {
		const driver = new NullFilesystem();
		const result = await driver.lastModified("filename");
		assert.is(result, 0);
	});

	it("should return empty array", async () => {
		const driver = new NullFilesystem();
		const result = await driver.files("dirname");
		assert.equal(result, []);
	});

	it("should return empty array", async () => {
		const driver = new NullFilesystem();
		const result = await driver.directories("dirname");
		assert.equal(result, []);
	});

	it("should return empty array", async () => {
		const driver = new NullFilesystem();
		const result = await driver.makeDirectory("dirname");
		assert.false(result);
	});

	it("should return empty array", async () => {
		const driver = new NullFilesystem();
		const result = await driver.deleteDirectory("dirname");
		assert.false(result);
	});
});
