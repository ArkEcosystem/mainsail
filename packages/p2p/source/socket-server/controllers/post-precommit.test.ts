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

	const factory = {
		makePrecommitFromBytes: () => {},
	};

	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.Cryptography.Message.Factory).toConstantValue(factory);
		context.sandbox.app.bind(Identifiers.Consensus.PrecommitProcessor).toConstantValue(processor);
		context.sandbox.app.bind(Identifiers.PeerRepository).toConstantValue({});
		context.sandbox.app.bind(Identifiers.PeerDisposer).toConstantValue({});

		context.controller = context.sandbox.app.resolve(PostPrecommitController);
	});

	it("#handle - should call processor", async ({ controller }) => {
		const spyOnFactory = spy(factory, "makePrecommitFromBytes");
		const spyOnProcess = spy(processor, "process");

		await controller.handle({ payload: { precommit: Buffer.from("") } }, {});
		spyOnProcess.calledOnce();
		spyOnFactory.calledOnce();
		spyOnFactory.calledWith(Buffer.from(""));
	});
});
