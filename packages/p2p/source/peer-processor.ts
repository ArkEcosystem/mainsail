import { inject, injectable, postConstruct, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Enums, Providers, Utils as KernelUtils } from "@mainsail/kernel";

import { isValidVersion } from "./utils";
import { isValidPeerIp } from "./validation";

@injectable()
export class PeerProcessor implements Contracts.P2P.PeerProcessor {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.PluginConfiguration)
	@tagged("plugin", "p2p")
	private readonly configuration!: Providers.PluginConfiguration;

	@inject(Identifiers.PeerRepository)
	private readonly repository!: Contracts.P2P.PeerRepository;

	@inject(Identifiers.PeerVerifier)
	private readonly peerVerifier!: Contracts.P2P.PeerVerifier;

	@inject(Identifiers.PeerDisposer)
	private readonly peerDisposer!: Contracts.P2P.PeerDisposer;

	@inject(Identifiers.PeerCommunicator)
	private readonly peerCommunicator!: Contracts.P2P.PeerCommunicator;

	@inject(Identifiers.PeerDiscoverer)
	private readonly peerDiscoverer!: Contracts.P2P.PeerDiscoverer;

	@inject(Identifiers.PeerApiNodeDiscoverer)
	private readonly peerApiNodeDiscoverer!: Contracts.P2P.PeerApiNodeDiscoverer;

	@inject(Identifiers.Kernel.EventDispatcher.Service)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.P2PLogger)
	private readonly logger!: Contracts.P2P.Logger;

	@postConstruct()
	public initialize(): void {
		this.events.listen(Enums.CryptoEvent.MilestoneChanged, {
			handle: () => this.#disconnectInvalidPeers(),
		});
	}

	public isWhitelisted(peer: Contracts.P2P.Peer): boolean {
		return KernelUtils.isWhitelisted(this.configuration.getOptional<string[]>("remoteAccess", []), peer.ip);
	}

	public async validateAndAcceptPeer(ip: string, options: Contracts.P2P.AcceptNewPeerOptions = {}): Promise<void> {
		if (this.repository.hasPeer(ip) || this.repository.hasPendingPeer(ip)) {
			return;
		}

		if (this.validatePeerIp(ip, options)) {
			await this.#acceptNewPeer(ip);
		}
	}

	public validatePeerIp(ip: string, options: Contracts.P2P.AcceptNewPeerOptions = {}): boolean {
		if (this.configuration.get("disableDiscovery")) {
			this.logger.warning(`Rejected ${ip} because the relay is in non-discovery mode.`);
			return false;
		}

		if (!isValidPeerIp(ip)) {
			return false;
		}

		if (!KernelUtils.isWhitelisted(this.configuration.getRequired("whitelist"), ip)) {
			return false;
		}

		if (KernelUtils.isBlacklisted(this.configuration.getRequired("blacklist"), ip)) {
			return false;
		}

		if (this.peerDisposer.isBanned(ip)) {
			return false;
		}

		const maxSameSubnetPeers = this.configuration.getRequired<number>("maxSameSubnetPeers");

		if (this.repository.getSameSubnetPeers(ip).length >= maxSameSubnetPeers && !options.seed) {
			this.logger.warningExtra(
				`Rejected ${ip} because we are already at the ${maxSameSubnetPeers} limit for peers sharing the same /24 subnet.`,
			);

			return false;
		}

		return true;
	}

	async #acceptNewPeer(ip: string): Promise<void> {
		const peer = this.app.get<Contracts.P2P.PeerFactory>(Identifiers.PeerFactory)(ip);

		this.repository.setPendingPeer(peer);

		if (await this.peerVerifier.verify(peer)) {
			this.repository.setPeer(peer);

			this.logger.debugExtra(`Accepted new peer ${peer.ip}:${peer.port} (v${peer.version})`);

			void this.events.dispatch(Enums.PeerEvent.Added, peer);

			await this.peerCommunicator.pingPorts(peer);

			await this.peerDiscoverer.discoverPeers(peer);

			await this.peerApiNodeDiscoverer.discoverApiNodes(peer);
		}

		this.repository.forgetPendingPeer(peer);
	}

	async #disconnectInvalidPeers(): Promise<void> {
		const peers = this.repository.getPeers();

		for (const peer of peers) {
			if (!peer.version || !isValidVersion(this.app, peer.version)) {
				this.peerDisposer.disposePeer(peer.ip);
			}
		}
	}
}
