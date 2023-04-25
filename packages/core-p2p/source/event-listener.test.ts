import { Identifiers } from "@arkecosystem/core-contracts";
import { Enums } from "@arkecosystem/core-kernel";
import { describe, Sandbox } from "@arkecosystem/core-test-framework";

import { EventListener } from "./event-listener";
import { DisconnectPeer } from "./listeners";

describe<{
	sandbox: Sandbox;
	eventListener: EventListener;
}>("EventListener", ({ it, beforeEach, spy, match }) => {
	const eventDispatcher = { listen: () => {} };

	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.EventDispatcherService).toConstantValue(eventDispatcher);
		context.sandbox.app.bind(Identifiers.PeerConnector).toConstantValue({});
		context.sandbox.app.bind(Identifiers.PeerRepository).toConstantValue({});

		context.eventListener = context.sandbox.app.resolve(EventListener);
	});

	it("should register a listener on PeerEvent.Disconnect to execute DisconnectPeer", ({ eventListener }) => {
		const spyListen = spy(eventDispatcher, "listen");

		eventListener.initialize();

		spyListen.calledOnce();
		spyListen.calledWith(Enums.PeerEvent.Disconnect, match.instanceOf(DisconnectPeer));
	});
});
