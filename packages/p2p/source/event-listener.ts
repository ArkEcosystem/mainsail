import { Contracts } from "@mainsail/contracts";
import { Enums } from "@mainsail/kernel";

import { DisconnectPeer } from "./listeners";

// @TODO review the implementation
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
