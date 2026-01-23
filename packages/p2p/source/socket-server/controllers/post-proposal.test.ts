import { Identifiers } from "@mainsail/constants";

import { Application } from "@mainsail/kernel";
import { Container } from "@mainsail/container";
import { describe } from "@mainsail/test-runner";
import { PostProposalController } from "./post-proposal";

describe<{
	app: Application;
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
		context.app = new Application(new Container());

		context.app.bind(Identifiers.Cryptography.Proposal.Factory).toConstantValue(factory);
		context.app.bind(Identifiers.Consensus.Processor.Proposal).toConstantValue(processor);
		context.app.bind(Identifiers.P2P.Peer.Repository).toConstantValue({});
		context.app.bind(Identifiers.P2P.Peer.Disposer).toConstantValue({});
		context.app.bind(Identifiers.P2P.State).toConstantValue(state);

		context.controller = context.app.resolve(PostProposalController);
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
