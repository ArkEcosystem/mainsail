import { Identifiers } from "@mainsail/contracts";

import { describe, Sandbox } from "../../../../test-framework";
import { PostPrevoteController } from "./post-prevote";

describe<{
	sandbox: Sandbox;
	controller: PostPrevoteController;
}>("PostProvoteController", ({ it, assert, beforeEach, stub, spy }) => {
	const factory = { makePrevoteFromBytes: () => {} };
	const handler = {
		onPrevote: () => {},
	};

	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.Consensus.Handler).toConstantValue(handler);
		context.sandbox.app.bind(Identifiers.Cryptography.Message.Factory).toConstantValue(factory);

		context.controller = context.sandbox.app.resolve(PostPrevoteController);
	});

	it("#handle - should deserialize prevote and call onPrevote handler", async ({ controller }) => {
		const prevote = { height: 1 };

		stub(factory, "makePrevoteFromBytes").resolvedValue(prevote);
		const spyOnPrevote = spy(handler, "onPrevote");

		await controller.handle({ payload: { prevote: Buffer.from("") } }, {});
		spyOnPrevote.calledOnce();
	});
});
