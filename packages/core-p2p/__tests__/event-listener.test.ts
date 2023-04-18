import { Container, Enums } from "@arkecosystem/core-kernel";

import { EventListener } from "@packages/core-p2p/source/event-listener";
import { DisconnectPeer } from "@packages/core-p2p/source/listeners";

describe("EventListener", () => {
	let eventListener: EventListener;

	const container = new Container.Container();

	const logger = { warning: jest.fn(), debug: jest.fn() };
	const disconnectPeerInstance = new DisconnectPeer();
	const app = { resolve: jest.fn().mockReturnValue(disconnectPeerInstance) };
	const emitter = { listen: jest.fn() };

	beforeAll(() => {
		container.unbindAll();
		container.bind(Identifiers.LogService).toConstantValue(logger);
		container.bind(Identifiers.Application).toConstantValue(app);
		container.bind(Identifiers.EventDispatcherService).toConstantValue(emitter);
	});

	beforeEach(() => {
		eventListener = container.resolve<EventListener>(EventListener);
	});

	describe("initialize", () => {
		it("should register a listener on PeerEvent.Disconnect to execute DisconnectPeer", () => {
			eventListener.initialize();

			expect(emitter.listen).toBeCalledTimes(1);
			expect(emitter.listen).toBeCalledWith(Enums.PeerEvent.Disconnect, disconnectPeerInstance);
		});
	});
});
