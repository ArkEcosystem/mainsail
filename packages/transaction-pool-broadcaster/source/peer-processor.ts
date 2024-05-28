import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers, Utils as KernelUtils } from "@mainsail/kernel";

@injectable()
export class PeerProcessor implements Contracts.TransactionPool.PeerProcessor {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "transaction-pool-broadcaster")
	private readonly configuration!: Providers.PluginConfiguration;

	@inject(Identifiers.P2P.Peer.Repository)
	private readonly repository!: Contracts.TransactionPool.PeerRepository;

	@inject(Identifiers.P2P.Peer.Verifier)
	private readonly peerVerifier!: Contracts.TransactionPool.PeerVerifier;

	@inject(Identifiers.P2P.Logger)
	private readonly logger!: Contracts.P2P.Logger;

	public async validateAndAcceptPeer(ip: string, options: Contracts.P2P.AcceptNewPeerOptions = {}): Promise<void> {
		if (this.repository.hasPeer(ip) || this.repository.hasPendingPeer(ip)) {
			return;
		}

		if (this.validatePeerIp(ip, options)) {
			await this.#acceptNewPeer(ip);
		}
	}

	public validatePeerIp(ip: string, options: Contracts.P2P.AcceptNewPeerOptions = {}): boolean {
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
		const peer = this.app.get<Contracts.TransactionPool.PeerFactory>(Identifiers.P2P.Peer.Factory)(ip);

		this.repository.setPendingPeer(peer);

		if (await this.peerVerifier.verify(peer)) {
			this.repository.setPeer(peer);
			this.logger.debugExtra(`Accepted new peer ${peer.ip}:${peer.port} (v${peer.version})`);
		}

		this.repository.forgetPendingPeer(peer);
	}
}
