import type { Contracts } from "@mainsail/contracts";
import type { Interfaces, Service as WebSocketService } from "@mainsail/p2p-websocket";

import { Events, Identifiers } from "@mainsail/constants";
import { inject, injectable, postConstruct } from "@mainsail/container";
import { CloseReason, ConnectionState } from "@mainsail/p2p-websocket";
import { ensureError } from "@mainsail/utils";

import type { Peer } from "./interfaces/index.js";

import { isValidVersion } from "./utils/index.js";

const BAN_REASONS = new Set<CloseReason>([CloseReason.PayloadTooLarge, CloseReason.ProtocolError]);

// Turns connections into active peers: every connection, dialed or inbound, is accepted and verified
// through the hook installed on the transport, so a peer becomes active only after a handshake and a
// verification. It applies no address rules: those run on the transport (PeerIpVerifier, ban list) for
// every inbound socket and every dial. Nothing calls it, so it has no contract; the provider constructs it.
@injectable()
export class PeerProcessor {
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

	// Public only because TypeScript treats a decorated private method as unused.
	@postConstruct()
	public initialize(): void {
		// The transport does not wait for the hook; a failure is logged, as a rejection nobody handles
		// would end the process, and the connection is closed so that the close listener clears its peer.
		this.websocketService.onConnection = (connection) => {
			this.#acceptConnection(connection).catch((rawError: unknown) => {
				this.logger.debug(
					`Accepting the connection of ${connection.remoteAddress} failed: ${ensureError(rawError).message}`,
					"p2p",
				);

				void connection.close();
			});
		};

		this.events.listen(Events.CryptoEvent.MilestoneChanged, {
			handle: async (): Promise<void> => this.#disconnectInvalidPeers(),
		});

		// The pool reports peers it cannot reach; the pool itself learns about peers from the repository's events.
		this.transactionPoolWorker.registerEventHandler(Events.PeerEvent.Removed, (ip: string) => {
			this.peerDisposer.disposePeer(ip);
		});
	}

	// Every open connection, inbound or outbound, is bound to its peer here and the peer is verified over it.
	async #acceptConnection(connection: Interfaces.Connection): Promise<void> {
		const ip = connection.remoteAddress;

		// Not expected: the transport keeps one connection per address and a connection that closes takes
		// its peer off both lists. Should it happen, the connection would have no owner, so it is closed.
		if (this.repository.hasActivePeer(ip) || this.repository.hasPendingPeer(ip)) {
			void connection.close();

			return;
		}

		const peer = this.repository.hasKnownPeer(ip)
			? (this.repository.getKnownPeer(ip) as Peer)
			: this.peerFactory(ip);
		peer.connection = connection;
		connection.onClose((reason, error) => this.#onClose(ip, reason, error));

		await this.#verifyPeer(peer, connection);
	}

	// A connection the peer broke by misbehaving (oversized frame, protocol violation) costs it a ban; one
	// that merely failed only puts it back among the known peers.
	#onClose(ip: string, reason: CloseReason, error?: Error): void {
		if (BAN_REASONS.has(reason)) {
			this.peerDisposer.banPeer(
				ip,
				new Error(`Connection closed: ${reason}${error ? ` (${error.message})` : ""}`),
			);
			return;
		}

		this.peerDisposer.disposePeer(ip);
	}

	// A peer leaves the pending list in two ways only: it becomes active here, or its connection closes
	// and the close listener disposes it. A known peer (a seed, or one that was active before) stays known
	// while it is pending, so a failed verification costs it only the pending entry and the service loop
	// dials it again; an address seen for the first time is dropped. A ban removes the peer from every list.
	async #verifyPeer(peer: Peer, connection: Interfaces.Connection): Promise<void> {
		this.repository.setPendingPeer(peer);

		const verified = await this.peerVerifier.verify(peer);

		// Closed meanwhile (by the peer, a timeout, a ban); the close listener settles the lists. The
		// transport keeps one connection per address, so while this one is open the peer is still ours.
		if (connection.state !== ConnectionState.Open) {
			return;
		}

		// A failed verification may leave the connection open; closing it has the close listener clean up.
		if (!verified) {
			void connection.close();

			return;
		}

		this.repository.setActivePeer(peer);
		peer.dialAttempts = 0;
		this.logger.debug(`Accepted new peer ${peer.ip}:${peer.port} (v${peer.version})`, "p2p");

		await this.peerDiscoverer.discoverPeers(peer);
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
