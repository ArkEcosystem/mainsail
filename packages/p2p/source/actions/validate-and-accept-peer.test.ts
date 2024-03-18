import { Identifiers } from "@mainsail/contracts";

import { describe, Sandbox } from "../../../test-framework/source";
import { ValidateAndAcceptPeerAction } from "./validate-and-accept-peer";

describe<{
	sandbox: Sandbox;
	action: ValidateAndAcceptPeerAction;
}>("ValidateAndAcceptPeerAction", ({ it, spy, beforeEach }) => {
	const peerProcessor = { validateAndAcceptPeer: () => {} };

	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.P2P.Peer.Processor).toConstantValue(peerProcessor);

		context.action = new ValidateAndAcceptPeerAction(context.sandbox.app);
	});

	it("#execute - should call peerProcessor.validateAndAcceptPeer with arguments provided", async ({ action }) => {
		const spyValidateAndAcceptPeer = spy(peerProcessor, "validateAndAcceptPeer");

		const options = { someParam: 1 };

		await action.execute({ ip: "187.165.33.2", options });

		spyValidateAndAcceptPeer.calledOnce();
		spyValidateAndAcceptPeer.calledWith("187.165.33.2", options);
	});
});
