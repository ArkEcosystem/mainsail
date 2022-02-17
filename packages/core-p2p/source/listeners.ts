import { Container, Contracts, Enums } from "@arkecosystem/core-kernel";

import { PeerConnector } from "./peer-connector";
import { isValidVersion } from "./utils";

@Container.injectable()
export class DisconnectInvalidPeers implements Contracts.Kernel.EventListener {
	@Container.inject(Container.Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@Container.inject(Container.Identifiers.PeerRepository)
	private readonly repository!: Contracts.P2P.PeerRepository;

	@Container.inject(Container.Identifiers.EventDispatcherService)
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

@Container.injectable()
export class DisconnectPeer implements Contracts.Kernel.EventListener {
	@Container.inject(Container.Identifiers.PeerConnector)
	private readonly connector!: PeerConnector;

	@Container.inject(Container.Identifiers.PeerRepository)
	private readonly repository!: Contracts.P2P.PeerRepository;

	public async handle({ data }): Promise<void> {
		this.connector.disconnect(data.peer);

		this.repository.forgetPeer(data.peer);
	}
}
