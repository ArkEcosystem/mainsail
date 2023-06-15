import { Identifiers } from "@mainsail/contracts";

import { describe, Sandbox } from "../../../../test-framework";
import { PostPrecommitController } from "./post-precommit";

describe<{
	sandbox: Sandbox;
	controller: PostPrecommitController;
}>("PostProvoteController", ({ it, assert, beforeEach, stub, spy }) => {
	const factory = { makePrecommitFromBytes: () => {} };
	const handler = {
		onPrecommit: () => {},
	};

	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.Consensus.Handler).toConstantValue(handler);
		context.sandbox.app.bind(Identifiers.Cryptography.Message.Factory).toConstantValue(factory);

		context.controller = context.sandbox.app.resolve(PostPrecommitController);
	});

	it("#handle - should deserialize prevote and call onPrecommit handler", async ({ controller }) => {
		const prevote = { height: 1 };

		stub(factory, "makePrecommitFromBytes").resolvedValue(prevote);
		const spyOnPrecommit = spy(handler, "onPrecommit");

		await controller.handle({ payload: { precommit: Buffer.from("") } }, {});
		spyOnPrecommit.calledOnce();
	});
});
