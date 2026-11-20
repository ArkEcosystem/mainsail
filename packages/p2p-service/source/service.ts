import type { Contracts } from "@mainsail/contracts";
import type { Service as WebSocketService } from "@mainsail/p2p-websocket";

import { EnvironmentVariables, Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { CloseReason, ConnectionError } from "@mainsail/p2p-websocket";
import { ensureError, shuffle } from "@mainsail/utils";
import dayjs from "dayjs";

import type { Peer } from "./interfaces/index.js";

import { constants } from "./constants.js";
import { percentile } from "./utils/index.js";

// Reasons a dial fails for that make the address not worth another dial.
const REFUSED_REASONS = new Set<CloseReason>([CloseReason.Banned, CloseReason.Rejected, CloseReason.VersionMismatch]);

// Port of the @mainsail/p2p service without API nodes. It also owns the transport lifecycle, which the
// old service left to the hapi server, and the redialing of known peers, which the old connector did
// on demand.
@injectable()
export class Service implements Contracts.P2PService.Service {
	@inject(Identifiers.P2P.WebSocket.Service)
	private readonly websocketService!: WebSocketService;

	@inject(Identifiers.P2P.Peer.Discoverer)
	private readonly peerDiscoverer!: Contracts.P2PService.PeerDiscoverer;

	@inject(Identifiers.P2P.Peer.Seeds)
	private readonly seeds!: Contracts.P2PService.Seeds;

	@inject(Identifiers.P2P.Peer.DialQueue)
	private readonly dialQueue!: Contracts.P2PService.DialQueue;

	@inject(Identifiers.P2P.Peer.Disposer)
	private readonly peerDisposer!: Contracts.P2PService.PeerDisposer;

	@inject(Identifiers.P2P.Peer.Repository)
	private readonly repository!: Contracts.P2PService.PeerRepository;

	@inject(Identifiers.P2P.Peer.Communicator)
	private readonly communicator!: Contracts.P2PService.PeerCommunicator;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly cryptoConfiguration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	#lastMinPeerCheck: dayjs.Dayjs = dayjs();
	readonly #refreshingPeers = new Set<string>();
	#disposed = false;
	#mainLoopTimeout?: NodeJS.Timeout = undefined;

	public async boot(): Promise<void> {
		if (process.env[EnvironmentVariables.MAINSAIL_ENV] === "test") {
			this.logger.info("Skipping P2P service boot, because test environment is used", "p2p");

			return;
		}

		await this.websocketService.boot();

		await this.seeds.load();
		await this.peerDiscoverer.populateSeedPeers();
		// The seeds are dialed here; they become peers once verified, which nothing at boot waits for.
		await this.#dialKnownPeers();

		void this.mainLoop();
	}

	public async mainLoop(): Promise<void> {
		try {
			await this.#dialKnownPeers();
			await this.#checkMinPeers();
			this.#refreshStaleHeaders();
		} catch (rawError) {
			this.logger.error(`P2P main loop failed: ${ensureError(rawError).message}`, "p2p");
		} finally {
			if (!this.#disposed) {
				this.#mainLoopTimeout = setTimeout(() => {
					void this.mainLoop();
				}, 2000);
			}
		}
	}

	// Same order as the old provider: stop the loop and the dialing of new addresses, say goodbye to the
	// peers, then stop the transport.
	public async dispose(): Promise<void> {
		this.#disposed = true;
		clearTimeout(this.#mainLoopTimeout);
		this.dialQueue.dispose();

		this.websocketService.onConnection = undefined;

		await this.peerDisposer.disposePeers();
		await this.websocketService.dispose();
	}

	// Known peers are the seeds and peers that lost their connection; they are dialed, spaced out, until
	// they become active or are given up. One that is pending already has a connection and is being verified.
	async #dialKnownPeers(): Promise<void> {
		const now = Date.now();
		const due = (this.repository.getKnownPeers() as Peer[]).filter(
			(peer) => !this.repository.hasPendingPeer(peer.ip) && now - peer.lastDialAt >= constants.DIAL_SPACING,
		);

		await Promise.all(due.map((peer) => this.#dial(peer)));
	}

	// A dial counts as failed until the peer is verified: the count is cleared only when the processor
	// makes the peer active, so a peer that answers but never passes the verification is given up too.
	async #dial(peer: Peer): Promise<void> {
		if (this.#isGivenUp(peer)) {
			this.repository.forgetKnownPeer(peer);

			return;
		}

		peer.lastDialAt = Date.now();
		peer.dialAttempts += 1;

		try {
			await this.websocketService.dial(peer.socketUrl);
		} catch (rawError) {
			const error = ensureError(rawError);
			this.logger.debug(`Dial to ${peer.ip}:${peer.port} failed: ${error.message}`, "p2p");

			if (this.#isRefused(error)) {
				this.repository.forgetKnownPeer(peer);
			}
		}
	}

	// Seeds get no exception, so that a node with enough peers does not keep knocking on them; a node
	// that is short of peers records them again in #checkMinPeers.
	#isGivenUp(peer: Peer): boolean {
		return peer.dialAttempts >= constants.MAX_DIAL_ATTEMPTS;
	}

	// Refused by our own address rules or ban list before a socket was opened, by the peer's during the
	// handshake, or by either side for the other's version. The address is not worth further dials;
	// discovery brings it back if that changes.
	#isRefused(error: Error): boolean {
		return error instanceof ConnectionError && REFUSED_REASONS.has(error.reason);
	}

	async #checkMinPeers(): Promise<void> {
		if (this.#lastMinPeerCheck.isAfter(dayjs().subtract(1, "minute"))) {
			return;
		}
		this.#lastMinPeerCheck = dayjs();

		if (!this.repository.hasMinimumPeers()) {
			this.logger.info(`Couldn't find enough peers. Falling back to seed peers.`, "p2p");

			await this.peerDiscoverer.populateSeedPeers();

			await Promise.all(
				shuffle(this.repository.getActivePeers())
					.slice(0, 8)
					.map((peer) => this.peerDiscoverer.discoverPeers(peer)),
			);
		}
	}

	// Every exchange with a peer, in either direction, carries its header, so on a live network the headers
	// stay fresh by themselves. A peer we have not heard from for a while is asked for its status: the
	// answer brings its header, which starts the downloads if we are behind, and a peer that does not
	// answer loses its connection to the request timeout. The peers with the oldest headers go first, a
	// few per turn, and the loop does not wait for the answers.
	#refreshStaleHeaders(): void {
		const { blockTime } = this.cryptoConfiguration.getMilestone().timeouts;
		const staleBefore = Date.now() - constants.HEADER_STALE_AFTER_BLOCKS * blockTime;

		const stalePeers = (this.repository.getActivePeers() as Peer[])
			.filter((peer) => peer.lastHeaderAt < staleBefore && !this.#refreshingPeers.has(peer.ip))
			.sort((a, b) => a.lastHeaderAt - b.lastHeaderAt)
			.slice(0, constants.HEADER_REFRESH_BATCH);

		for (const peer of stalePeers) {
			void this.#refreshHeader(peer);
		}
	}

	// The communicator hands the header of the answer to the header service. A failed connection has
	// already disposed the peer; any other failure is the peer's and bans it.
	async #refreshHeader(peer: Peer): Promise<void> {
		this.#refreshingPeers.add(peer.ip);

		try {
			await this.communicator.getStatus(peer);
		} catch (rawError) {
			const error = ensureError(rawError);
			this.logger.debug(`Failed to get the status of ${peer.ip}: ${error.message}`, "p2p");
			this.peerDisposer.banPeer(peer.ip, error);
		} finally {
			this.#refreshingPeers.delete(peer.ip);
		}
	}

	public getNetworkBlockNumberPercentile(p: number): number {
		const blockNumbers = this.repository
			.getActivePeers()
			.filter((peer) => peer.header.blockNumber)
			.map((peer) => peer.header.blockNumber);

		return percentile(blockNumbers, p);
	}
}
