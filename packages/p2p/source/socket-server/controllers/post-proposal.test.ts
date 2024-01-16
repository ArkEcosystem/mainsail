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

	const state = {
		resetLastMessageTime: () => {},
	};

	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.Cryptography.Message.Factory).toConstantValue(factory);
		context.sandbox.app.bind(Identifiers.Consensus.Processor.Proposal).toConstantValue(processor);
		context.sandbox.app.bind(Identifiers.P2P.Peer.Repository).toConstantValue({});
		context.sandbox.app.bind(Identifiers.P2P.Peer.Disposer).toConstantValue({});
		context.sandbox.app.bind(Identifiers.P2P.State).toConstantValue(state);

		context.controller = context.sandbox.app.resolve(PostProposalController);
	});

	it("#handle - should call processor", async ({ controller }) => {
		const spyOnFactory = spy(factory, "makeProposalFromBytes");
		const spyOnProcess = spy(processor, "process");
		const spyOnResetLastMessageTime = spy(state, "resetLastMessageTime");

		await controller.handle({ payload: { proposal: Buffer.from("") } }, {});
		spyOnProcess.calledOnce();
		spyOnFactory.calledOnce();
		spyOnFactory.calledWith(Buffer.from(""));
		spyOnResetLastMessageTime.calledOnce();
	});
});
