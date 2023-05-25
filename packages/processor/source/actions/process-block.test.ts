import { describe } from "../../../test-framework";
import { ProcessBlockAction } from "./process-block";

describe("ProcessBlockAction", ({ assert, it, stub, match }) => {
	it("should execute", async () => {
		const roundState = {};

		const blockProcessor = {
			process: () => {},
		};

		const spyOnProcess = stub(blockProcessor, "process");

		const action = new ProcessBlockAction();

		await action.execute({ roundState, blockProcessor });

		spyOnProcess.calledOnce();
		spyOnProcess.calledWith(roundState);
	});
});
