import type { Contracts } from "@mainsail/contracts";

import { percentile } from "@mainsail/blockchain-utils";
import { EnvironmentVariables, Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";
import { ensureError, groupBy, pluralize, randomNumber, shuffle } from "@mainsail/utils";
import dayjs from "dayjs";

import { constants } from "./constants.js";

@injectable()
export class Service implements Contracts.P2P.Service {
	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "p2p")
	private readonly configuration!: Contracts.Kernel.PluginConfiguration;

	@inject(Identifiers.P2P.State)
	private readonly state!: Contracts.P2P.State;

	@inject(Identifiers.P2P.Peer.Discoverer)
	private readonly peerDiscoverer!: Contracts.P2P.PeerDiscoverer;

	@inject(Identifiers.P2P.ApiNode.Discoverer)
	private readonly ApiNodeDiscoverer!: Contracts.P2P.ApiNodeDiscoverer;

	@inject(Identifiers.P2P.Peer.Verifier)
	private readonly peerVerifier!: Contracts.P2P.PeerVerifier;

	@inject(Identifiers.P2P.Peer.Repository)
	private readonly repository!: Contracts.P2P.PeerRepository;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	#lastMinPeerCheck: dayjs.Dayjs = dayjs();
	#verifyingPeers = new Set<string>();
	#disposed = false;
	#mainLoopTimeout?: NodeJS.Timeout = undefined;
	#apiNodeCheckLoopTimeout?: NodeJS.Timeout = undefined;

	public async boot(): Promise<void> {
		if (process.env[EnvironmentVariables.MAINSAIL_ENV] === "test") {
			this.logger.info("Skipping P2P service boot, because test environment is used", "p2p");

			return;
		}

		await this.ApiNodeDiscoverer.populateApiNodesFromConfiguration();

		await this.peerDiscoverer.populateSeedPeers();

		for (const [version, peers] of Object.entries(
			groupBy(this.repository.getPeers(), (peer) => peer.version ?? "unknown"),
		)) {
			this.logger.info(`Discovered ${pluralize("peer", peers.length, true)} with v${version}.`, "p2p");
		}

		void this.mainLoop();
		void this.#checkApiNodes();
	}

	public async mainLoop(): Promise<void> {
		try {
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

	public async dispose(): Promise<void> {
		this.#disposed = true;
		clearTimeout(this.#mainLoopTimeout);
		clearTimeout(this.#apiNodeCheckLoopTimeout);
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

	async #checkApiNodes(): Promise<void> {
		try {
			await this.ApiNodeDiscoverer.discoverNewApiNodes();
			await this.ApiNodeDiscoverer.refreshApiNodes();
		} catch (rawError) {
			this.logger.error(`API node check failed: ${ensureError(rawError).message}`, "p2p");
		} finally {
			if (!this.#disposed) {
				const nextTimeout = randomNumber(10, 20) * 60 * 1000;
				this.#apiNodeCheckLoopTimeout = setTimeout(() => {
					void this.#checkApiNodes();
				}, nextTimeout);
			}
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
