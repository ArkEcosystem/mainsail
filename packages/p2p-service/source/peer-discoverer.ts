import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { ensureError } from "@mainsail/utils";

@injectable()
export class PeerDiscoverer implements Contracts.P2PService.PeerDiscoverer {
	@inject(Identifiers.P2P.Peer.Seeds)
	private readonly seeds!: Contracts.P2PService.Seeds;

	@inject(Identifiers.P2P.Peer.Repository)
	private readonly repository!: Contracts.P2PService.PeerRepository;

	@inject(Identifiers.P2P.Peer.Factory)
	private readonly peerFactory!: Contracts.P2PService.PeerFactory;

	@inject(Identifiers.P2P.Peer.Communicator)
	private readonly communicator!: Contracts.P2PService.PeerCommunicator;

	@inject(Identifiers.P2P.Peer.Disposer)
	private readonly peerDisposer!: Contracts.P2PService.PeerDisposer;

	@inject(Identifiers.P2P.Peer.DialQueue)
	private readonly dialQueue!: Contracts.P2PService.DialQueue;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	// Waits for the peer's answer only; the addresses in it are dialed in the background.
	public async discoverPeers(peer: Contracts.P2PService.Peer): Promise<void> {
		try {
			const { peers } = await this.communicator.getPeers(peer);

			for (const { ip } of peers) {
				this.dialQueue.add(ip);
			}
		} catch (rawError) {
			const error = ensureError(rawError);
			this.logger.debug(`Failed to get peers from ${peer.ip}: ${error.message}`, "p2p");
			this.peerDisposer.banPeer(peer.ip, error);
		}
	}

	// Seeds are recorded as known, not merely dialed once: the service loop dials them like any known peer,
	// so a seed that is still starting is tried again after DIAL_SPACING. The loop gives them up like any
	// other peer too; the service records them again while the node is short of peers.
	public async populateSeedPeers(): Promise<void> {
		for (const ip of this.seeds.all()) {
			if (this.repository.hasPeer(ip)) {
				continue;
			}

			this.repository.setKnownPeer(this.peerFactory(ip));
		}
	}
}
