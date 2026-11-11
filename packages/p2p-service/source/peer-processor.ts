import type { Contracts } from "@mainsail/contracts";
import type { Interfaces, Service as WebSocketService } from "@mainsail/p2p-websocket";

import { Events, Identifiers } from "@mainsail/constants";
import { inject, injectable, postConstruct, tagged } from "@mainsail/container";
import { IpAddress } from "@mainsail/utils";

import type { Peer } from "./interfaces/index.js";

import { isValidVersion } from "./utils/index.js";

// Port of the @mainsail/p2p processor without the tx pool node and API node checks. Unlike the old
// one it never connects: addresses are only recorded as known, and a peer is verified when the
// transport reports its open connection. The connection hook replaces the accept-peer plugin.
@injectable()
export class PeerProcessor implements Contracts.P2PService.PeerProcessor {
	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "p2p-service")
	private readonly configuration!: Contracts.Kernel.PluginConfiguration;

	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.P2P.WebSocket.Service)
	private readonly websocketService!: WebSocketService;

	@inject(Identifiers.P2P.Peer.Factory)
	private readonly peerFactory!: (ip: string) => Peer;

	@inject(Identifiers.P2P.Peer.Repository)
	private readonly repository!: Contracts.P2PService.PeerRepository;

	@inject(Identifiers.P2P.Peer.Verifier)
	private readonly peerVerifier!: Contracts.P2PService.PeerVerifier;

	@inject(Identifiers.P2P.Peer.IpVerifier)
	private readonly peerIpVerifier!: Interfaces.ConnectionVerifier;

	@inject(Identifiers.P2P.Peer.Seeds)
	private readonly seeds!: Contracts.P2PService.Seeds;

	@inject(Identifiers.P2P.Peer.Disposer)
	private readonly peerDisposer!: Contracts.P2PService.PeerDisposer;

	@inject(Identifiers.P2P.Peer.Discoverer)
	private readonly peerDiscoverer!: Contracts.P2PService.PeerDiscoverer;

	@inject(Identifiers.TransactionPool.Worker)
	private readonly transactionPoolWorker!: Contracts.TransactionPool.Worker;

	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.P2P.Logger)
	private readonly logger!: Contracts.P2PService.Logger;

	@postConstruct()
	private initialize(): void {
		this.websocketService.onConnection = (connection) => void this.#acceptConnection(connection);

		this.events.listen(Events.CryptoEvent.MilestoneChanged, {
			handle: async (): Promise<void> => this.#disconnectInvalidPeers(),
		});

		this.transactionPoolWorker.registerEventHandler(Events.PeerEvent.Removed, (ip: string) => {
			this.peerDisposer.disposePeer(ip);
		});
	}

	public async validateAndAcceptPeer(rawIp: string): Promise<void> {
		const ip = IpAddress.sanitizeRemoteAddress(rawIp);
		if (!ip) {
			return;
		}

		if (this.repository.hasPeer(ip) || this.repository.hasPendingPeer(ip) || this.repository.hasKnownPeer(ip)) {
			return;
		}

		if (!this.seeds.isSeed(ip) && this.configuration.getOptional<boolean>("disableDiscovery", false)) {
			this.logger.debug(`Rejected ${ip} because the relay is in non-discovery mode.`, "p2p");
			return;
		}

		// The rules the transport applies to a socket, so an address we would refuse is never recorded.
		if (this.peerIpVerifier.verify(ip) !== undefined || this.peerDisposer.isBanned(ip)) {
			return;
		}

		this.repository.setKnownPeer(this.peerFactory(ip));
		this.logger.debug(`Discovered peer ${ip}`, "p2p");
	}

	// Every open connection, inbound or outbound, is bound to its peer here and the peer is verified over it.
	async #acceptConnection(connection: Interfaces.Connection): Promise<void> {
		const ip = connection.remoteAddress;

		if (this.repository.hasPeer(ip) || this.repository.hasPendingPeer(ip)) {
			return;
		}

		// The address rules and the ban list already ran on the transport before the handshake.
		if (!this.seeds.isSeed(ip) && this.configuration.getOptional<boolean>("disableDiscovery", false)) {
			this.logger.debug(`Rejected ${ip} because the relay is in non-discovery mode.`, "p2p");
			this.peerDisposer.disposePeer(ip);
			return;
		}

		const peer = this.repository.hasKnownPeer(ip)
			? (this.repository.getKnownPeer(ip) as Peer)
			: this.peerFactory(ip);
		peer.connection = connection;
		connection.onClose(() => this.peerDisposer.disposePeer(ip));

		await this.#verifyPeer(peer);
	}

	async #verifyPeer(peer: Contracts.P2PService.Peer): Promise<void> {
		this.repository.forgetKnownPeer(peer);
		this.repository.setPendingPeer(peer);

		try {
			if (!(await this.peerVerifier.verify(peer))) {
				return;
			}

			if (this.peerDisposer.isBanned(peer.ip)) {
				return;
			}

			// Concurrent accepts from one subnet all pass the transport's check; re-check now that they landed.
			if (this.peerIpVerifier.verify(peer.ip) !== undefined) {
				this.peerDisposer.disposePeer(peer.ip);
				return;
			}

			this.repository.setPeer(peer);
			this.logger.debug(`Accepted new peer ${peer.ip}:${peer.port} (v${peer.version})`, "p2p");

			void this.events.dispatch(Events.PeerEvent.Added, peer);

			await this.transactionPoolWorker.setPeer(peer.ip);

			await this.peerDiscoverer.discoverPeers(peer);
		} catch {
			this.peerDisposer.disposePeer(peer.ip);
		} finally {
			this.repository.forgetPendingPeer(peer);
		}
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
