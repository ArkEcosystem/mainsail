import { Identifiers } from "@mainsail/constants";

import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { PostMessageController } from "./post-message.js";

describe<{
	app: Application;
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
		context.app = new Application();

		context.app.bind(Identifiers.Cryptography.Message.Factory).toConstantValue(factory);
		context.app.bind(Identifiers.Consensus.Processor.Message).toConstantValue(processor);
		context.app.bind(Identifiers.P2P.Peer.Repository).toConstantValue({});
		context.app.bind(Identifiers.P2P.Peer.Disposer).toConstantValue({});
		context.app.bind(Identifiers.P2P.State).toConstantValue(state);

		context.controller = context.app.resolve(PostMessageController);
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
