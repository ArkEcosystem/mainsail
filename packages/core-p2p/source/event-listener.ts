import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Enums } from "@arkecosystem/core-kernel";
import { injectable, inject } from "@arkecosystem/core-container";

import { DisconnectPeer } from "./listeners";

// todo: review the implementation
@injectable()
export class EventListener {
	@inject(Identifiers.Application)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.EventDispatcherService)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	public initialize(): void {
		this.events.listen(Enums.PeerEvent.Disconnect, this.app.resolve(DisconnectPeer));
	}
}
