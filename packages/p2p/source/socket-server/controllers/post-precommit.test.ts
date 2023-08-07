import { Identifiers } from "@mainsail/contracts";

import { describe, Sandbox } from "../../../../test-framework";
import { PostPrecommitController } from "./post-precommit";

describe<{
	sandbox: Sandbox;
	controller: PostPrecommitController;
}>("PostPrecommitController", ({ it, beforeEach, spy }) => {
	const processor = {
		process: () => {},
	};

	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.Consensus.PrecommitProcessor).toConstantValue(processor);

		context.controller = context.sandbox.app.resolve(PostPrecommitController);
	});

	it("#handle - should call processor", async ({ controller }) => {
		const spyOnProcess = spy(processor, "process");

		await controller.handle({ payload: { precommit: Buffer.from("") } }, {});
		spyOnProcess.calledOnce();
	});
});
