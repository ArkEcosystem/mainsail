import type { Contracts } from "@mainsail/contracts";
import type { Service as WebSocketService } from "@mainsail/p2p-websocket";

import { EnvironmentVariables, Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";
import { CloseReason, ConnectionError } from "@mainsail/p2p-websocket";
import { ensureError, groupBy, pluralize, shuffle } from "@mainsail/utils";
import dayjs from "dayjs";

import type { Peer } from "./interfaces/index.js";

import { constants } from "./constants.js";
import { getPeerSocketUrl, percentile } from "./utils/index.js";

// Port of the @mainsail/p2p service without API nodes. It also owns the transport lifecycle, which the
// old service left to the hapi server, and the redialing of known peers, which the old connector did
// on demand.
@injectable()
export class Service implements Contracts.P2PService.Service {
	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "p2p-service")
	private readonly configuration!: Contracts.Kernel.PluginConfiguration;

	@inject(Identifiers.P2P.WebSocket.Service)
	private readonly websocketService!: WebSocketService;

	@inject(Identifiers.P2P.State)
	private readonly state!: Contracts.P2PService.State;

	@inject(Identifiers.P2P.Peer.Discoverer)
	private readonly peerDiscoverer!: Contracts.P2PService.PeerDiscoverer;

	@inject(Identifiers.P2P.Peer.Seeds)
	private readonly seeds!: Contracts.P2PService.Seeds;

	@inject(Identifiers.P2P.Peer.Verifier)
	private readonly peerVerifier!: Contracts.P2PService.PeerVerifier;

	@inject(Identifiers.P2P.Peer.Disposer)
	private readonly peerDisposer!: Contracts.P2PService.PeerDisposer;

	@inject(Identifiers.P2P.Peer.Repository)
	private readonly repository!: Contracts.P2PService.PeerRepository;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	#lastMinPeerCheck: dayjs.Dayjs = dayjs();
	#verifyingPeers = new Set<string>();
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
		await this.#dialKnownPeers();

		for (const [version, peers] of Object.entries(
			groupBy(this.repository.getPeers(), (peer) => peer.version ?? "unknown"),
		)) {
			this.logger.info(`Discovered ${pluralize("peer", peers.length, true)} with v${version}.`, "p2p");
		}

		void this.mainLoop();
	}

	public async mainLoop(): Promise<void> {
		try {
			await this.#dialKnownPeers();
			await this.#checkMinPeers();
			await this.#checkReceivedMessages();
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

	// Same order as the old provider: stop the loop, say goodbye to the peers, then stop the transport.
	public async dispose(): Promise<void> {
		this.#disposed = true;
		clearTimeout(this.#mainLoopTimeout);

		this.websocketService.onConnection = undefined;

		await this.peerDisposer.disposePeers();
		await this.websocketService.dispose();
	}

	// Known peers are the seeds and peers that lost their connection; they are dialed, spaced out, until
	// they answer or are given up.
	async #dialKnownPeers(): Promise<void> {
		const now = Date.now();
		const due = (this.repository.getKnownPeers() as Peer[]).filter(
			(peer) => now - (peer.lastDialAt ?? 0) >= constants.DIAL_SPACING,
		);

		await Promise.all(due.map((peer) => this.#dial(peer)));
	}

	async #dial(peer: Peer): Promise<void> {
		peer.lastDialAt = Date.now();

		try {
			await this.websocketService.dial(getPeerSocketUrl(peer));
			peer.dialFailures = 0;
		} catch (rawError) {
			const error = ensureError(rawError);
			this.logger.debug(`Dial to ${peer.ip}:${peer.port} failed: ${error.message}`, "p2p");

			this.#forgetIfHopeless(peer, error);
		}
	}

	// The transport refuses addresses that may not be peers (rules, bans) before opening a socket; such an
	// address is dropped at once. One that only does not answer is dropped after repeated failures.
	#forgetIfHopeless(peer: Peer, error: Error): void {
		peer.dialFailures = (peer.dialFailures ?? 0) + 1;

		const refused =
			error instanceof ConnectionError &&
			(error.reason === CloseReason.Rejected || error.reason === CloseReason.Banned);

		const hopeless = peer.dialFailures >= constants.MAX_DIAL_FAILURES && !this.seeds.isSeed(peer.ip);

		if ((refused || hopeless) && this.repository.hasKnownPeer(peer.ip)) {
			this.repository.forgetKnownPeer(peer);
		}
	}

	async #checkMinPeers(): Promise<void> {
		if (this.#lastMinPeerCheck.isAfter(dayjs().subtract(1, "minute"))) {
			return;
		}
		this.#lastMinPeerCheck = dayjs();

		if (!this.repository.hasMinimumPeers()) {
			this.logger.info(`Couldn't find enough peers. Falling back to seed peers.`, "p2p");

			await this.peerDiscoverer.populateSeedPeers();

			for (const peer of shuffle(this.repository.getPeers()).slice(0, 8)) {
				await this.peerDiscoverer.discoverPeers(peer);
			}
		}
	}

	async #checkReceivedMessages(): Promise<void> {
		if (this.state.getLastMessageTime().isBefore(dayjs().subtract(8, "seconds"))) {
			const peersCount = Math.max(Math.ceil(this.repository.getPeers().length * 0.2), 5);

			await this.cleansePeers({
				fast: true,
				peerCount: peersCount,
			});
		}
	}

	public async cleansePeers({ fast, peerCount }: { fast: boolean; peerCount: number }): Promise<void> {
		const peers = shuffle(this.repository.getPeers().filter((peer) => !this.#verifyingPeers.has(peer.ip))).slice(
			0,
			peerCount,
		);

		if (peers.length === 0) {
			return;
		}

		let unresponsivePeers = 0;
		const verifyTimeout = fast
			? constants.FAST_VERIFY_TIMEOUT
			: this.configuration.getRequired<number>("verifyTimeout");

		this.logger.info(`Checking ${pluralize("peer", peers.length, true)}`, "p2p");

		const verifications = Promise.all(
			peers.map(async (peer) => {
				this.#verifyingPeers.add(peer.ip);

				try {
					if (!(await this.peerVerifier.verify(peer))) {
						unresponsivePeers++;
					}
				} finally {
					this.#verifyingPeers.delete(peer.ip);
				}
			}),
		).catch((rawError) => {
			this.logger.error(`Peer verification failed: ${ensureError(rawError).message}`, "p2p");
		});

		let cutoff: NodeJS.Timeout | undefined;
		await Promise.race([
			verifications,
			new Promise<void>((resolve) => {
				cutoff = setTimeout(resolve, verifyTimeout);
			}),
		]);
		clearTimeout(cutoff);

		if (unresponsivePeers > 0) {
			this.logger.debug(`Removed ${pluralize("peer", unresponsivePeers, true)}`, "p2p");
		}
	}

	public getNetworkBlockNumberPercentile(p: number): number {
		const blockNumbers = this.repository
			.getPeers()
			.filter((peer) => peer.header.blockNumber)
			.map((peer) => peer.header.blockNumber);

		return percentile(blockNumbers, p);
	}
}
