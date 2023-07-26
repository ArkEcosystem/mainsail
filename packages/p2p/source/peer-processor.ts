import { inject, injectable, postConstruct, tagged } from "@mainsail/container";
import { Constants, Contracts, Identifiers } from "@mainsail/contracts";
import { Enums, Providers, Utils as KernelUtils } from "@mainsail/kernel";

import { isValidVersion } from "./utils";
import { isValidPeerIp } from "./validation";

// @TODO review the implementation
@injectable()
export class PeerProcessor implements Contracts.P2P.PeerProcessor {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.PluginConfiguration)
	@tagged("plugin", "p2p")
	private readonly configuration!: Providers.PluginConfiguration;

	@inject(Identifiers.PeerCommunicator)
	private readonly communicator!: Contracts.P2P.PeerCommunicator;

	@inject(Identifiers.PeerConnector)
	private readonly connector!: Contracts.P2P.PeerConnector;

	@inject(Identifiers.PeerRepository)
	private readonly repository!: Contracts.P2P.PeerRepository;

	@inject(Identifiers.EventDispatcherService)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	public server: any;
	public nextUpdateNetworkStatusScheduled = false;

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
		if (this.validatePeerIp(ip, options)) {
			await this.#acceptNewPeer(ip, options);
		}
	}

	public validatePeerIp(ip: string, options: Contracts.P2P.AcceptNewPeerOptions = {}): boolean {
		if (this.configuration.get("disableDiscovery")) {
			this.logger.warning(`Rejected ${ip} because the relay is in non-discovery mode.`);

			return false;
		}

		if (!isValidPeerIp(ip) || this.repository.hasPendingPeer(ip)) {
			return false;
		}

		// Is Whitelisted
		if (!KernelUtils.isWhitelisted(this.configuration.getRequired("whitelist"), ip)) {
			return false;
		}

		// Is Blacklisted
		if (KernelUtils.isBlacklisted(this.configuration.getRequired("blacklist"), ip)) {
			return false;
		}

		const maxSameSubnetPeers = this.configuration.getRequired<number>("maxSameSubnetPeers");

		if (this.repository.getSameSubnetPeers(ip).length >= maxSameSubnetPeers && !options.seed) {
			if (process.env[Constants.Flags.CORE_P2P_PEER_VERIFIER_DEBUG_EXTRA]) {
				this.logger.warning(
					`Rejected ${ip} because we are already at the ${maxSameSubnetPeers} limit for peers sharing the same /24 subnet.`,
				);
			}

			return false;
		}

		return true;
	}

	public dispose(peer: Contracts.P2P.Peer): void {
		this.connector.disconnect(peer);
		this.repository.forgetPeer(peer);
		peer.dispose();

		void this.events.dispatch(Enums.PeerEvent.Removed, peer);
	}

	async #acceptNewPeer(ip: string, options: Contracts.P2P.AcceptNewPeerOptions): Promise<void> {
		if (this.repository.hasPeer(ip)) {
			return;
		}

		const peer = this.app.get<Contracts.P2P.PeerFactory>(Identifiers.PeerFactory)(ip);

		try {
			this.repository.setPendingPeer(peer);

			const verifyTimeout = this.configuration.getRequired<number>("verifyTimeout");

			await this.communicator.ping(peer, verifyTimeout);

			this.repository.setPeer(peer);

			if (!options.lessVerbose || process.env[Constants.Flags.CORE_P2P_PEER_VERIFIER_DEBUG_EXTRA]) {
				this.logger.debug(`Accepted new peer ${peer.ip}:${peer.port} (v${peer.version})`);
			}

			// eslint-disable-next-line @typescript-eslint/no-floating-promises
			this.events.dispatch(Enums.PeerEvent.Added, peer);
		} catch {
			this.connector.disconnect(peer);
		} finally {
			this.repository.forgetPendingPeer(peer);
		}
	}

	async #disconnectInvalidPeers(): Promise<void> {
		const peers = this.repository.getPeers();

		for (const peer of peers) {
			if (!isValidVersion(this.app, peer)) {
				this.dispose(peer);
			}
		}
	}
}
