import { describe } from "../../../core-test-framework";
import { ProcessBlockAction } from "./process-block";

describe("ProcessBlockAction", ({ assert, it, stub, match }) => {
	it("should execute", async () => {
		const block = {
			id: "dummy_block_id",
		};

		const blockProcessor = {
			process: () => {},
		};

		const spyOnProcess = stub(blockProcessor, "process");

		const action = new ProcessBlockAction();

		await action.execute({ block, blockProcessor });

		spyOnProcess.calledOnce();
		spyOnProcess.calledWith(block);
	});
});
