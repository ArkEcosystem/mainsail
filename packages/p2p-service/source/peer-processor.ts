import type { Contracts } from "@mainsail/contracts";

import { Events, Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { IpAddress } from "@mainsail/utils";

// Port of the @mainsail/p2p processor without the acceptance rules: every verified address is accepted.
// Whitelist, blacklist, subnet limit and discovery mode follow in a later step.
@injectable()
export class PeerProcessor implements Contracts.P2P.PeerProcessor {
	@inject(Identifiers.P2P.Peer.Repository)
	private readonly repository!: Contracts.P2P.PeerRepository;

	@inject(Identifiers.P2P.Peer.Factory)
	private readonly peerFactory!: Contracts.P2P.PeerFactory;

	@inject(Identifiers.P2P.Peer.Verifier)
	private readonly peerVerifier!: Contracts.P2P.PeerVerifier;

	@inject(Identifiers.P2P.Peer.Disposer)
	private readonly peerDisposer!: Contracts.P2P.PeerDisposer;

	@inject(Identifiers.P2P.Peer.Discoverer)
	private readonly peerDiscoverer!: Contracts.P2P.PeerDiscoverer;

	@inject(Identifiers.TransactionPool.Worker)
	private readonly transactionPoolWorker!: Contracts.TransactionPool.Worker;

	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.P2P.Logger)
	private readonly logger!: Contracts.P2P.Logger;

	public initialize(): void {}

	public async validateAndAcceptPeer(rawIp: string): Promise<void> {
		const ip = IpAddress.sanitizeRemoteAddress(rawIp);
		if (!ip) {
			return;
		}

		if (this.repository.hasPeer(ip) || this.repository.hasPendingPeer(ip)) {
			return;
		}

		await this.#acceptNewPeer(ip);
	}

	public validatePeerIp(ip: string): boolean {
		return IpAddress.sanitizeRemoteAddress(ip) !== undefined;
	}

	public isWhitelisted(): boolean {
		return true;
	}

	async #acceptNewPeer(ip: string): Promise<void> {
		const peer = this.peerFactory(ip);

		this.repository.setPendingPeer(peer);

		try {
			if (!(await this.peerVerifier.verify(peer))) {
				return;
			}

			if (this.peerDisposer.isBanned(peer.ip)) {
				return;
			}

			this.repository.setPeer(peer);
			this.logger.debug(`Accepted new peer ${peer.ip}:${peer.port} (v${peer.version})`, "p2p");

			void this.events.dispatch(Events.PeerEvent.Added, peer);

			await this.transactionPoolWorker.setPeer(peer.ip);

			await this.peerDiscoverer.discoverPeers(peer);
		} catch {
			this.peerDisposer.disposePeer(ip);
		} finally {
			this.repository.forgetPendingPeer(peer);
		}
	}
}
