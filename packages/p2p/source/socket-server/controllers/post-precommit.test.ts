import { Identifiers } from "@mainsail/contracts";

import { describe, Sandbox } from "../../../../test-framework/source";
import { PostPrecommitController } from "./post-precommit";

describe<{
	sandbox: Sandbox;
	controller: PostPrecommitController;
}>("PostPrecommitController", ({ it, beforeEach, spy }) => {
	const processor = {
		process: () => {},
	};

	const factory = {
		makePrecommitFromBytes: () => {},
	};

	const state = {
		resetLastMessageTime: () => {},
	};

	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.Cryptography.Message.Factory).toConstantValue(factory);
		context.sandbox.app.bind(Identifiers.Consensus.Processor.PreCommit).toConstantValue(processor);
		context.sandbox.app.bind(Identifiers.P2P.Peer.Repository).toConstantValue({});
		context.sandbox.app.bind(Identifiers.P2P.Peer.Disposer).toConstantValue({});
		context.sandbox.app.bind(Identifiers.P2P.State).toConstantValue(state);

		context.controller = context.sandbox.app.resolve(PostPrecommitController);
	});

	it("#handle - should call processor", async ({ controller }) => {
		const spyOnFactory = spy(factory, "makePrecommitFromBytes");
		const spyOnProcess = spy(processor, "process");
		const spyOnResetLastMessageTime = spy(state, "resetLastMessageTime");

		await controller.handle({ payload: { precommit: Buffer.from("") } }, {});
		spyOnProcess.calledOnce();
		spyOnFactory.calledOnce();
		spyOnFactory.calledWith(Buffer.from(""));
		spyOnResetLastMessageTime.calledOnce();
	});
});
