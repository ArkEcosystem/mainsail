import { Identifiers } from "@mainsail/core-contracts";
import { describe, Sandbox } from "../../../core-test-framework";

import { ValidateAndAcceptPeerAction } from "./validate-and-accept-peer";

describe<{
	sandbox: Sandbox;
	action: ValidateAndAcceptPeerAction;
}>("ValidateAndAcceptPeerAction", ({ it, spy, beforeEach }) => {
	const peerProcessor = { validateAndAcceptPeer: () => {} };

	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.PeerProcessor).toConstantValue(peerProcessor);

		context.action = new ValidateAndAcceptPeerAction(context.sandbox.app);
	});

	it("#execute - should call peerProcessor.validateAndAcceptPeer with arguments provided", async ({ action }) => {
		const spyValidateAndAcceptPeer = spy(peerProcessor, "validateAndAcceptPeer");

		const peer = { ip: "187.165.33.2", port: 4000 };
		const options = { someParam: 1 };

		await action.execute({ options, peer });

		spyValidateAndAcceptPeer.calledOnce();
		spyValidateAndAcceptPeer.calledWith(peer, options);
	});
});
