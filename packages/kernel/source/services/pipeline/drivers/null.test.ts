import { describe } from "../../../../../test-framework/source";
import { NullPipeline } from "./null";

describe("NullPipeline.pipe", ({ assert, it }) => {
	it("should return new piped pipeline", () => {
		const driver = new NullPipeline<string>();
		const result = driver.pipe(async (a: string) => a);
		assert.is.not(result, driver);
		assert.instance(result, NullPipeline);
	});

	it("should return undefined", async () => {
		const driver = new NullPipeline();
		const result = await driver.process("payload");
		assert.undefined(result);
	});
});
