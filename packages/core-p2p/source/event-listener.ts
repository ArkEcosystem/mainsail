import Contracts, { Identifiers } from "@arkecosystem/core-contracts";
import { Container, Enums } from "@arkecosystem/core-kernel";

import { DisconnectPeer } from "./listeners";

// todo: review the implementation
@Container.injectable()
export class EventListener {
	@Container.inject(Identifiers.Application)
	protected readonly app!: Contracts.Kernel.Application;

	@Container.inject(Identifiers.EventDispatcherService)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	public initialize(): void {
		this.events.listen(Enums.PeerEvent.Disconnect, this.app.resolve(DisconnectPeer));
	}
}
