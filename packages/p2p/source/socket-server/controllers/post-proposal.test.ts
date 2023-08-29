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

	const factory = {
		makeProposalFromBytes: () => {},
	};

	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.Cryptography.Message.Factory).toConstantValue(factory);
		context.sandbox.app.bind(Identifiers.Consensus.ProposalProcessor).toConstantValue(processor);
		context.sandbox.app.bind(Identifiers.PeerRepository).toConstantValue({});
		context.sandbox.app.bind(Identifiers.PeerDisposer).toConstantValue({});

		context.controller = context.sandbox.app.resolve(PostProposalController);
	});

	it("#handle - should call processor", async ({ controller }) => {
		const spyOnFactory = spy(factory, "makeProposalFromBytes");
		const spyOnProcess = spy(processor, "process");

		await controller.handle({ payload: { proposal: Buffer.from("") } }, {});
		spyOnProcess.calledOnce();
		spyOnFactory.calledOnce();
		spyOnFactory.calledWith(Buffer.from(""));
	});
});
