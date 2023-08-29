import { Identifiers } from "@mainsail/contracts";

import { describe, Sandbox } from "../../../../test-framework";
import { PostPrevoteController } from "./post-prevote";

describe<{
	sandbox: Sandbox;
	controller: PostPrevoteController;
}>("PostPrevoteController", ({ it, beforeEach, spy }) => {
	const processor = {
		process: () => {},
	};

	const factory = {
		makePrevoteFromBytes: () => {},
	};

	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.Cryptography.Message.Factory).toConstantValue(factory);
		context.sandbox.app.bind(Identifiers.Consensus.PrevoteProcessor).toConstantValue(processor);
		context.sandbox.app.bind(Identifiers.PeerRepository).toConstantValue({});
		context.sandbox.app.bind(Identifiers.PeerDisposer).toConstantValue({});

		context.controller = context.sandbox.app.resolve(PostPrevoteController);
	});

	it("#handle - should call processor", async ({ controller }) => {
		const spyOnFactory = spy(factory, "makePrevoteFromBytes");

		const spyOnProcess = spy(processor, "process");

		await controller.handle({ payload: { prevote: Buffer.from("") } }, {});
		spyOnProcess.calledOnce();
		spyOnFactory.calledOnce();
		spyOnFactory.calledWith(Buffer.from(""));
	});
});
