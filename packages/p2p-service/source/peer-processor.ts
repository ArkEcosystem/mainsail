import type { Contracts } from "@mainsail/contracts";

import { Events, Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { IpAddress } from "@mainsail/utils";

// Minimal port of the @mainsail/p2p processor: every address is accepted as it is. Verification,
// whitelist, blacklist, subnet limit and tx pool checks follow in later steps.
@injectable()
export class PeerProcessor implements Contracts.P2P.PeerProcessor {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.P2P.Peer.Repository)
	private readonly repository!: Contracts.P2P.PeerRepository;

	@inject(Identifiers.P2P.Peer.Factory)
	private readonly peerFactory!: Contracts.P2P.PeerFactory;

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

		if (this.repository.hasPeer(ip)) {
			return;
		}

		const peer = this.peerFactory(ip);
		// TODO: Use version from connection
		peer.version = this.app.version();

		this.repository.setPeer(peer);
		this.logger.debug(`Accepted new peer ${peer.ip}:${peer.port} (v${peer.version})`, "p2p");

		void this.events.dispatch(Events.PeerEvent.Added, peer);

		await this.transactionPoolWorker.setPeer(peer.ip);
	}

	public validatePeerIp(ip: string): boolean {
		return IpAddress.sanitizeRemoteAddress(ip) !== undefined;
	}

	public isWhitelisted(): boolean {
		return true;
	}
}
