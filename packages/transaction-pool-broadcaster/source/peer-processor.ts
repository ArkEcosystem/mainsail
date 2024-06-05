import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers, Utils as KernelUtils, Ipc } from "@mainsail/kernel";

@injectable()
export class PeerProcessor implements Contracts.TransactionPool.PeerProcessor {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "transaction-pool-broadcaster")
	private readonly configuration!: Providers.PluginConfiguration;

	@inject(Identifiers.TransactionPool.Peer.Repository)
	private readonly repository!: Contracts.TransactionPool.PeerRepository;

	// @inject(Identifiers.TransactionPool.Peer.Verifier)
	// private readonly peerVerifier!: Contracts.TransactionPool.PeerVerifier;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	public async validateAndAcceptPeer(ip: string): Promise<void> {
		if (this.repository.hasPeer(ip) || this.repository.hasPendingPeer(ip)) {
			return;
		}

		if (this.validatePeerIp(ip)) {
			await this.#acceptNewPeer(ip);
		}
	}

	public validatePeerIp(ip: string): boolean {
		// if (!isValidPeerIp(ip)) {
		// 	return false;
		// }

		if (!KernelUtils.isWhitelisted(this.configuration.getRequired("whitelist"), ip)) {
			return false;
		}

		if (KernelUtils.isBlacklisted(this.configuration.getRequired("blacklist"), ip)) {
			return false;
		}

		return true;
	}

	async #acceptNewPeer(ip: string): Promise<void> {
		const peer = this.app.get<Contracts.TransactionPool.PeerFactory>(Identifiers.TransactionPool.Peer.Factory)(ip);

		this.repository.setPendingPeer(peer);

		// if (await this.peerVerifier.verify(peer)) {
		if (true) {
			this.repository.setPeer(peer);
			this.logger.debug(`Accepted new peer ${peer.ip}:${peer.port} (v${peer.version})`);
		} else {
			Ipc.emit("peer.removed", peer.ip);
		}

		this.repository.forgetPendingPeer(peer.ip);
	}
}
