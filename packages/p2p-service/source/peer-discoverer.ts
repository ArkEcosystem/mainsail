import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { ensureError } from "@mainsail/utils";

@injectable()
export class PeerDiscoverer implements Contracts.P2PService.PeerDiscoverer {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

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

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	async discoverPeers(peer: Contracts.P2PService.Peer): Promise<void> {
		try {
			const { peers } = await this.communicator.getPeers(peer);

			for (const peer of peers) {
				await this.#getProcessor().validateAndAcceptPeer(peer.ip);
			}
		} catch (rawError) {
			const error = ensureError(rawError);
			this.logger.debug(`Failed to get peers from ${peer.ip}: ${error.message}`, "p2p");
			this.peerDisposer.banPeer(peer.ip, error);
		}
	}

	// Seeds are recorded as known, not merely dialed once: the service loop keeps dialing them until they
	// answer and never gives them up, so a seed that is still starting is reached within DIAL_SPACING.
	async populateSeedPeers(): Promise<void> {
		for (const ip of this.seeds.all()) {
			if (this.repository.hasPeer(ip)) {
				continue;
			}

			this.repository.setKnownPeer(this.peerFactory(ip));
		}
	}

	#getProcessor(): Contracts.P2PService.PeerProcessor {
		return this.app.get<Contracts.P2PService.PeerProcessor>(Identifiers.P2P.Peer.Processor);
	}
}
