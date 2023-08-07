import { Identifiers } from "@mainsail/contracts";

import { describe, Sandbox } from "../../../../test-framework";
import { PostProposalController } from "./post-proposal";

describe<{
	sandbox: Sandbox;
	controller: PostProposalController;
}>("PostProposalController", ({ it, beforeEach, spy }) => {
	const processor = {
		process: () => {},
	};

	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.Consensus.ProposalProcessor).toConstantValue(processor);

		context.controller = context.sandbox.app.resolve(PostProposalController);
	});

	it("#handle - should call processor", async ({ controller }) => {
		const spyOnProcess = spy(processor, "process");

		await controller.handle({ payload: { proposal: Buffer.from("") } }, {});
		spyOnProcess.calledOnce();
	});
});
