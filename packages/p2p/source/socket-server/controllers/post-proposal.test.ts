import { Identifiers } from "@mainsail/contracts";

import { describe, Sandbox } from "../../../../test-framework";
import { PostProposalController } from "./post-proposal";

describe<{
	sandbox: Sandbox;
	controller: PostProposalController;
}>("PostProvoteController", ({ it, assert, beforeEach, stub, spy }) => {
	const factory = { makeProposalFromBytes: () => {} };
	const handler = {
		onProposal: () => {},
	};

	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.Consensus.Handler).toConstantValue(handler);
		context.sandbox.app.bind(Identifiers.Cryptography.Message.Factory).toConstantValue(factory);

		context.controller = context.sandbox.app.resolve(PostProposalController);
	});

	it("#handle - should deserialize prevote and call onPrevote handler", async ({ controller }) => {
		const prevote = { height: 1 };

		stub(factory, "makeProposalFromBytes").resolvedValue(prevote);
		const spyOnPrevote = spy(handler, "onProposal");

		await controller.handle({ payload: { proposal: Buffer.from("") } }, {});
		spyOnPrevote.calledOnce();
	});
});
