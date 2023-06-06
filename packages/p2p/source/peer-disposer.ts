import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Enums } from "@mainsail/kernel";

import { PeerConnector } from "./peer-connector";

@injectable()
export class PeerDiposer implements Contracts.P2P.PeerDisposer {
	@inject(Identifiers.PeerConnector)
	private readonly connector!: PeerConnector;

	@inject(Identifiers.PeerRepository)
	private readonly repository!: Contracts.P2P.PeerRepository;

	@inject(Identifiers.EventDispatcherService)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	public async dispose(peer: Contracts.P2P.Peer): Promise<void> {
		this.connector.disconnect(peer);
		this.repository.forgetPeer(peer);
		await peer.dispose();

		await this.events.dispatch(Enums.PeerEvent.Removed, peer);
	}
}
