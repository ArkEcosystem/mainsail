import { Identifiers } from "@mainsail/constants";

import { Application } from "@mainsail/kernel";
import { Container } from "@mainsail/container";
import { describe } from "@mainsail/test-runner";
import { ValidateAndAcceptPeerAction } from "./validate-and-accept-peer";

describe<{
	app: Application;
	action: ValidateAndAcceptPeerAction;
}>("ValidateAndAcceptPeerAction", ({ it, spy, beforeEach }) => {
	const peerProcessor = { validateAndAcceptPeer: () => { } };

	beforeEach((context) => {
		context.app = new Application(new Container());

		context.app.bind(Identifiers.P2P.Peer.Processor).toConstantValue(peerProcessor);

		context.action = new ValidateAndAcceptPeerAction(context.app);
	});

	it("#execute - should call peerProcessor.validateAndAcceptPeer with arguments provided", async ({ action }) => {
		const spyValidateAndAcceptPeer = spy(peerProcessor, "validateAndAcceptPeer");

		const options = { someParam: 1 };

		await action.execute({ ip: "187.165.33.2", options });

		spyValidateAndAcceptPeer.calledOnce();
		spyValidateAndAcceptPeer.calledWith("187.165.33.2", options);
	});
});
