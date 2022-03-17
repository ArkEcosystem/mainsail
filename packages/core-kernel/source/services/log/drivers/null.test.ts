import { describe } from "../../../../../core-test-framework";
import { NullLogger } from "./null";

describe("NullLogger", ({ assert, it }) => {
	it("should return instance itself", async () => {
		const driver = new NullLogger();
		const result = await driver.make();
		assert.is(result, driver);
	});

	it("should return undefined", () => {
		const driver = new NullLogger();
		const result = driver.emergency("message");
		assert.undefined(result);
	});

	it("should return undefined", () => {
		const driver = new NullLogger();
		const result = driver.alert("message");
		assert.undefined(result);
	});

	it("should return undefined", () => {
		const driver = new NullLogger();
		const result = driver.critical("message");
		assert.undefined(result);
	});

	it("should return undefined", () => {
		const driver = new NullLogger();
		const result = driver.error("message");
		assert.undefined(result);
	});

	it("should return undefined", () => {
		const driver = new NullLogger();
		const result = driver.warning("message");
		assert.undefined(result);
	});

	it("should return undefined", () => {
		const driver = new NullLogger();
		const result = driver.notice("message");
		assert.undefined(result);
	});

	it("should return undefined", () => {
		const driver = new NullLogger();
		const result = driver.info("message");
		assert.undefined(result);
	});

	it("should return undefined", () => {
		const driver = new NullLogger();
		const result = driver.debug("message");
		assert.undefined(result);
	});

	it("should return undefined", () => {
		const driver = new NullLogger();
		const result = driver.suppressConsoleOutput(true);
		assert.undefined(result);
	});
});
