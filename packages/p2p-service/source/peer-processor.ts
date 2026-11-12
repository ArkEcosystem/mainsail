import type { Contracts } from "@mainsail/contracts";
import type { Interfaces, Service as WebSocketService } from "@mainsail/p2p-websocket";

import { Events, Identifiers } from "@mainsail/constants";
import { inject, injectable, postConstruct } from "@mainsail/container";
import { ConnectionState } from "@mainsail/p2p-websocket";
import { ensureError, IpAddress } from "@mainsail/utils";

import type { Peer } from "./interfaces/index.js";

import { getPeerSocketUrl, isValidVersion } from "./utils/index.js";

// Turns addresses into active peers. It applies no address rules: those run on the transport
// (PeerIpVerifier, ban list) for every inbound socket and every dial.
@injectable()
export class PeerProcessor implements Contracts.P2PService.PeerProcessor {
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

	// Public only because TypeScript treats a decorated private method as unused; not part of the contract.
	@postConstruct()
	public initialize(): void {
		this.websocketService.onConnection = (connection) => void this.#acceptConnection(connection);

		this.events.listen(Events.CryptoEvent.MilestoneChanged, {
			handle: async (): Promise<void> => this.#disconnectInvalidPeers(),
		});

		// The pool reports peers it cannot reach; the pool itself learns about peers from the repository's events.
		this.transactionPoolWorker.registerEventHandler(Events.PeerEvent.Removed, (ip: string) => {
			this.peerDisposer.disposePeer(ip);
		});
	}

	// Dials a new address; the connection, if it opens, arrives through the transport hook like any other.
	// A known peer is left to the service loop, which spaces its dials out.
	public async validateAndAcceptPeer(rawIp: string): Promise<void> {
		const ip = IpAddress.sanitizeRemoteAddress(rawIp);
		if (!ip) {
			return;
		}

		if (this.repository.hasPeer(ip)) {
			return;
		}

		const peer = this.peerFactory(ip);

		try {
			await this.websocketService.dial(getPeerSocketUrl(peer));
		} catch (rawError) {
			this.logger.debug(`Dial to ${peer.ip}:${peer.port} failed: ${ensureError(rawError).message}`, "p2p");
		}
	}

	// Every open connection, inbound or outbound, is bound to its peer here and the peer is verified over it.
	async #acceptConnection(connection: Interfaces.Connection): Promise<void> {
		const ip = connection.remoteAddress;

		if (this.repository.hasActivePeer(ip) || this.repository.hasPendingPeer(ip)) {
			return;
		}

		const peer = this.repository.hasKnownPeer(ip)
			? (this.repository.getKnownPeer(ip) as Peer)
			: this.peerFactory(ip);
		peer.connection = connection;
		peer.dialFailures = 0;
		connection.onClose(() => this.peerDisposer.disposePeer(ip));

		await this.#verifyPeer(peer);
	}

	async #verifyPeer(peer: Peer): Promise<void> {
		this.repository.forgetKnownPeer(peer);
		this.repository.setPendingPeer(peer);

		try {
			if (!(await this.peerVerifier.verify(peer))) {
				return;
			}

			// A ban, a remote close or an error during the verification closed the connection; the close
			// listener has put the peer back among the known ones.
			if (peer.connection?.state !== ConnectionState.Open) {
				return;
			}

			this.repository.setActivePeer(peer);
			this.logger.debug(`Accepted new peer ${peer.ip}:${peer.port} (v${peer.version})`, "p2p");

			await this.peerDiscoverer.discoverPeers(peer);
		} catch {
			this.peerDisposer.disposePeer(peer.ip);
		} finally {
			this.repository.forgetPendingPeer(peer);
		}
	}

	async #disconnectInvalidPeers(): Promise<void> {
		const peers = this.repository.getActivePeers();

		for (const peer of peers) {
			if (!peer.version || !isValidVersion(this.app, peer.version)) {
				this.peerDisposer.disposePeer(peer.ip);
			}
		}
	}
}
