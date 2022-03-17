import { describe } from "../../../../../core-test-framework";
import { NullPipeline } from "./null";

describe("NullPipeline.pipe", ({ assert, it }) => {
	it("should return new piped pipeline", () => {
		const driver = new NullPipeline();
		const result = driver.pipe(() => {});
		assert.is.not(result, driver);
		assert.instance(result, NullPipeline);
	});

	it("should return undefined", async () => {
		const driver = new NullPipeline();
		const result = await driver.process("payload");
		assert.undefined(result);
	});

	it("should return undefined", () => {
		const driver = new NullPipeline();
		const result = driver.processSync("payload");
		assert.undefined(result);
	});
});
