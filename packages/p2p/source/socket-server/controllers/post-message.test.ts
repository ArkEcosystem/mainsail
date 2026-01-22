import { Identifiers } from "@mainsail/constants";

import { describe, Sandbox } from "@mainsail/test-framework";
import { PostMessageController } from "./post-message.js";

describe<{
	sandbox: Sandbox;
	controller: PostMessageController;
}>("PostMessageController", ({ it, beforeEach, spy }) => {
	const processor = {
		process: () => {},
	};

	const factory = {
		makeMessageFromBytes: () => {},
	};

	const state = {
		resetLastMessageTime: () => {},
	};

	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.Cryptography.Message.Factory).toConstantValue(factory);
		context.sandbox.app.bind(Identifiers.Consensus.Processor.Message).toConstantValue(processor);
		context.sandbox.app.bind(Identifiers.P2P.Peer.Repository).toConstantValue({});
		context.sandbox.app.bind(Identifiers.P2P.Peer.Disposer).toConstantValue({});
		context.sandbox.app.bind(Identifiers.P2P.State).toConstantValue(state);

		context.controller = context.sandbox.app.resolve(PostMessageController);
	});

	it("#handle - should call processor", async ({ controller }) => {
		const spyOnFactory = spy(factory, "makeMessageFromBytes");
		const spyOnProcess = spy(processor, "process");
		const spyOnResetLastMessageTime = spy(state, "resetLastMessageTime");

		await controller.handle({ payload: { message: Buffer.from("") } }, {});
		spyOnProcess.calledOnce();
		spyOnFactory.calledOnce();
		spyOnFactory.calledWith(Buffer.from(""));
		spyOnResetLastMessageTime.calledOnce();
	});
});
