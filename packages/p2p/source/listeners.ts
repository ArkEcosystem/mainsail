import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Enums } from "@mainsail/kernel";

import { PeerConnector } from "./peer-connector";
import { isValidVersion } from "./utils";

@injectable()
export class DisconnectInvalidPeers implements Contracts.Kernel.EventListener {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.PeerRepository)
	private readonly repository!: Contracts.P2P.PeerRepository;

	@inject(Identifiers.EventDispatcherService)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	public async handle(): Promise<void> {
		const peers: Contracts.P2P.Peer[] = this.repository.getPeers();

		for (const peer of peers) {
			if (!isValidVersion(this.app, peer)) {
				await this.events.dispatch(Enums.PeerEvent.Disconnect, { peer });
			}
		}
	}
}

@injectable()
export class DisconnectPeer implements Contracts.Kernel.EventListener {
	@inject(Identifiers.PeerConnector)
	private readonly connector!: PeerConnector;

	@inject(Identifiers.PeerRepository)
	private readonly repository!: Contracts.P2P.PeerRepository;

	public async handle({ data }): Promise<void> {
		this.connector.disconnect(data.peer);

		this.repository.forgetPeer(data.peer);
	}
}
