import { ProcessBlockAction } from "./process-block";

import { describe } from "../../../core-test-framework";

describe("ProcessBlockAction", ({ assert, beforeEach, it, spyFn }) => {
	it("should execute", async () => {
		const block = {
			id: "dummy_block_id",
		};

		const blockProcessor = {
			process: spyFn(),
		};

		const action = new ProcessBlockAction();

		await action.execute({ blockProcessor, block });

		assert.true(blockProcessor.process.calledWith(block));
	});
});
