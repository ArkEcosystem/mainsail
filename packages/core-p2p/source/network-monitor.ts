import { inject, injectable, postConstruct, tagged } from "@arkecosystem/core-container";
import { Constants, Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Enums, Providers, Services, Utils } from "@arkecosystem/core-kernel";
import delay from "delay";

import { NetworkState } from "./network-state";
import { Peer } from "./peer";
import { PeerCommunicator } from "./peer-communicator";

const defaultDownloadChunkSize = 400;

// @TODO review the implementation
@injectable()
export class NetworkMonitor implements Contracts.P2P.NetworkMonitor {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.PluginConfiguration)
	@tagged("plugin", "core-p2p")
	private readonly configuration!: Providers.PluginConfiguration;

	@inject(Identifiers.PeerCommunicator)
	private readonly communicator!: PeerCommunicator;

	@inject(Identifiers.PeerRepository)
	private readonly repository!: Contracts.P2P.PeerRepository;

	@inject(Identifiers.PeerChunkCache)
	private readonly chunkCache!: Contracts.P2P.ChunkCache;

	@inject(Identifiers.EventDispatcherService)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Cryptography.Time.Slots)
	private readonly slots: Contracts.Crypto.Slots;

	public config: any;
	public nextUpdateNetworkStatusScheduled: boolean | undefined;
	#coldStart = false;

	#downloadChunkSize: number = defaultDownloadChunkSize;

	#initializing = true;

	@postConstruct()
	public initialize(): void {
		this.config = this.configuration.all(); // >_<
	}

	public async boot(): Promise<void> {
		await this.#populateSeedPeers();

		if (this.config.skipDiscovery) {
			this.logger.warning("Skipped peer discovery because the relay is in skip-discovery mode.");
		} else {
			await this.updateNetworkStatus(true);

			for (const [version, peers] of Object.entries(
				// @ts-ignore
				Utils.groupBy(this.repository.getPeers(), (peer) => peer.version),
			)) {
				this.logger.info(`Discovered ${Utils.pluralize("peer", peers.length, true)} with v${version}.`);
			}
		}

		// Give time to cooldown rate limits after peer verifier finished.
		await Utils.sleep(1000);

		this.#initializing = false;
	}

	public async updateNetworkStatus(initialRun?: boolean): Promise<void> {
		if (process.env[Constants.Flags.CORE_ENV] === "test") {
			return;
		}

		if (this.config.networkStart) {
			this.#coldStart = true;
			this.logger.warning("Entering cold start because the relay is in genesis-start mode.");
		}

		if (this.config.disableDiscovery) {
			this.logger.warning("Skipped peer discovery because the relay is in non-discovery mode.");
			return;
		}

		try {
			if (await this.discoverPeers(initialRun)) {
				await this.cleansePeers();
			}
		} catch (error) {
			this.logger.error(`Network Status: ${error.message}`);
		}

		let nextRunDelaySeconds = 600;

		if (!this.#hasMinimumPeers()) {
			await this.#populateSeedPeers();

			nextRunDelaySeconds = 60;

			this.logger.info(`Couldn't find enough peers. Falling back to seed peers.`);
		}

		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		this.#scheduleUpdateNetworkStatus(nextRunDelaySeconds);
	}

	public async cleansePeers({
		fast = false,
		forcePing = false,
		peerCount,
	}: { fast?: boolean; forcePing?: boolean; peerCount?: number } = {}): Promise<void> {
		let peers = this.repository.getPeers();
		let max = peers.length;

		let unresponsivePeers = 0;
		const pingDelay = fast ? 1500 : this.config.verifyTimeout;

		if (peerCount) {
			peers = Utils.shuffle(peers).slice(0, peerCount);
			max = Math.min(peers.length, peerCount);
		}

		this.logger.info(`Checking ${Utils.pluralize("peer", max, true)}`);
		const peerErrors = {};

		// we use Promise.race to cut loose in case some communicator.ping() does not resolve within the delay
		// in that case we want to keep on with our program execution while ping promises can finish in the background
		await new Promise<void>(async (resolve) => {
			let isResolved = false;

			// Simulates Promise.race, but doesn't cause "multipleResolvers" process error
			const resolvesFirst = () => {
				if (!isResolved) {
					isResolved = true;
					resolve();
				}
			};

			await Promise.all(
				peers.map(async (peer) => {
					try {
						await this.communicator.ping(peer, pingDelay, forcePing);
					} catch (error) {
						unresponsivePeers++;

						peerErrors[error] = peerErrors[error] || [];
						peerErrors[error].push(peer);

						await this.events.dispatch(Enums.PeerEvent.Disconnect, { peer });

						// eslint-disable-next-line @typescript-eslint/no-floating-promises
						this.events.dispatch(Enums.PeerEvent.Removed, peer);
					}
				}),
			).then(resolvesFirst);

			await delay(pingDelay).finally(resolvesFirst);
		});

		for (const key of Object.keys(peerErrors)) {
			const peerCount = peerErrors[key].length;
			this.logger.debug(`Removed ${Utils.pluralize("peer", peerCount, true)} because of "${key}"`);
		}

		if (this.#initializing) {
			this.logger.info(
				`${max - unresponsivePeers} of ${Utils.pluralize("peer", max, true)} on the network are responsive`,
			);
			this.logger.info(`Median Network Height: ${this.getNetworkHeight().toLocaleString()}`);
		}
	}

	public async discoverPeers(pingAll?: boolean): Promise<boolean> {
		const maxPeersPerPeer = 50;
		const ownPeers: Contracts.P2P.Peer[] = this.repository.getPeers();
		const theirPeers: Contracts.P2P.Peer[] = Object.values(
			(
				await Promise.all(
					Utils.shuffle(this.repository.getPeers())
						.slice(0, 8)
						.map(async (peer: Contracts.P2P.Peer) => {
							try {
								const hisPeers = await this.communicator.getPeers(peer);
								return hisPeers || [];
							} catch (error) {
								this.logger.debug(`Failed to get peers from ${peer.ip}: ${error.message}`);
								return [];
							}
						}),
				)
			)
				.map((peers) =>
					Object.fromEntries(
						Utils.shuffle(peers)
							.slice(0, maxPeersPerPeer)
							.map(
								// @ts-ignore - rework this so TS stops throwing errors
								(current: Contracts.P2P.PeerBroadcast) => [
									current.ip,
									new Peer(current.ip, current.port),
								],
							),
					),
				)
				.reduce(
					(accumulator: object, current: { [ip: string]: Contracts.P2P.Peer }) => ({
						...accumulator,
						...current,
					}),
					{},
				),
		);

		if (pingAll || !this.#hasMinimumPeers() || ownPeers.length < theirPeers.length * 0.75) {
			await Promise.all(
				theirPeers.map((p) =>
					this.app
						.get<Services.Triggers.Triggers>(Identifiers.TriggerService)
						.call("validateAndAcceptPeer", { options: { lessVerbose: true }, peer: p }),
				),
			);
			// eslint-disable-next-line @typescript-eslint/no-floating-promises
			this.#pingPeerPorts(pingAll);

			return true;
		}

		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		this.#pingPeerPorts();

		return false;
	}

	public isColdStart(): boolean {
		return this.#coldStart;
	}

	public completeColdStart(): void {
		this.#coldStart = false;
	}

	public getNetworkHeight(): number {
		const medians = this.repository
			.getPeers()
			.filter((peer) => peer.state.height)
			.map((peer) => peer.state.height)
			.sort((a, b) => {
				Utils.assert.defined<string>(a);
				Utils.assert.defined<string>(b);

				return a - b;
			});

		return medians[Math.floor(medians.length / 2)] || 0;
	}

	public async getNetworkState(): Promise<Contracts.P2P.NetworkState> {
		await this.cleansePeers({ fast: true, forcePing: true });

		return await NetworkState.analyze(this, this.repository, this.slots);
	}

	public async refreshPeersAfterFork(): Promise<void> {
		this.logger.info(`Refreshing ${Utils.pluralize("peer", this.repository.getPeers().length, true)} after fork.`);

		await this.cleansePeers({ forcePing: true });
	}

	public async checkNetworkHealth(): Promise<Contracts.P2P.NetworkStatus> {
		await this.discoverPeers(true);
		await this.cleansePeers({ forcePing: true });

		const lastBlock: Contracts.Crypto.IBlock = this.app
			.get<Contracts.State.StateStore>(Identifiers.StateStore)
			.getLastBlock();

		const verificationResults: Contracts.P2P.PeerVerificationResult[] = this.repository
			.getPeers()
			.filter((peer) => peer.verificationResult)
			.map((peer) => peer.verificationResult);

		if (verificationResults.length === 0) {
			this.logger.info("No verified peers available.");

			return { forked: false };
		}

		const forkVerificationResults: Contracts.P2P.PeerVerificationResult[] = verificationResults.filter(
			(verificationResult: Contracts.P2P.PeerVerificationResult) => verificationResult.forked,
		);

		const forkHeights: number[] = forkVerificationResults
			.map((verificationResult: Contracts.P2P.PeerVerificationResult) => verificationResult.highestCommonHeight)
			.filter((forkHeight, index, array) => array.indexOf(forkHeight) === index) // unique
			.sort()
			.reverse();

		for (const forkHeight of forkHeights) {
			const forkPeerCount = forkVerificationResults.filter((vr) => vr.highestCommonHeight === forkHeight).length;
			const ourPeerCount = verificationResults.filter((vr) => vr.highestCommonHeight > forkHeight).length + 1;

			if (forkPeerCount > ourPeerCount) {
				const blocksToRollback = lastBlock.data.height - forkHeight;

				if (blocksToRollback > 5000) {
					this.logger.info(
						`Rolling back 5000/${blocksToRollback} blocks to fork at height ${forkHeight} (${ourPeerCount} vs ${forkPeerCount}).`,
					);

					return { blocksToRollback: 5000, forked: true };
				} else {
					this.logger.info(
						`Rolling back ${blocksToRollback} blocks to fork at height ${forkHeight} (${ourPeerCount} vs ${forkPeerCount}).`,
					);

					return { blocksToRollback, forked: true };
				}
			} else {
				this.logger.debug(`Ignoring fork at height ${forkHeight} (${ourPeerCount} vs ${forkPeerCount}).`);
			}
		}

		return { forked: false };
	}

	public async downloadBlocksFromHeight(
		fromBlockHeight: number,
		maxParallelDownloads = 10,
	): Promise<Contracts.Crypto.IBlockData[]> {
		const peersAll: Contracts.P2P.Peer[] = this.repository.getPeers();

		if (peersAll.length === 0) {
			this.logger.error(`Could not download blocks: we have 0 peers`);
			return [];
		}

		const peersNotForked: Contracts.P2P.Peer[] = Utils.shuffle(peersAll.filter((peer) => !peer.isForked()));

		if (peersNotForked.length === 0) {
			this.logger.error(
				`Could not download blocks: We have ${peersAll.length} peer(s) but all ` +
					`of them are on a different chain than us`,
			);
			return [];
		}

		const networkHeight: number = this.getNetworkHeight();
		let chunksMissingToSync: number;

		if (!networkHeight || networkHeight <= fromBlockHeight) {
			chunksMissingToSync = 1;
		} else {
			chunksMissingToSync = Math.ceil((networkHeight - fromBlockHeight) / this.#downloadChunkSize);
		}
		const chunksToDownload: number = Math.min(chunksMissingToSync, peersNotForked.length, maxParallelDownloads);

		// We must return an uninterrupted sequence of blocks, starting from `fromBlockHeight`,
		// with sequential heights, without gaps.

		const downloadJobs = [];
		const downloadResults: any = [];
		let someJobFailed = false;
		let chunksHumanReadable = "";

		for (let index = 0; index < chunksToDownload; index++) {
			const height: number = fromBlockHeight + this.#downloadChunkSize * index;
			const isLastChunk: boolean = index === chunksToDownload - 1;
			const blocksRange = `[${(height + 1).toLocaleString()}, ${(isLastChunk
				? ".."
				: height + this.#downloadChunkSize
			).toLocaleString()}]`;

			//@ts-ignore
			downloadJobs.push(async () => {
				if (this.chunkCache.has(blocksRange)) {
					downloadResults[index] = this.chunkCache.get(blocksRange);
					// Remove it from the cache so that it does not get served many times
					// from the cache. In case of network reorganization or downloading
					// flawed chunks we want to re-download from another peer.
					this.chunkCache.remove(blocksRange);
					return;
				}

				let blocks!: Contracts.Crypto.IBlockData[];
				let peer: Contracts.P2P.Peer;
				let peerPrint!: string;

				// As a first peer to try, pick such a peer that different jobs use different peers.
				// If that peer fails then pick randomly from the remaining peers that have not
				// been first-attempt for any job.
				const peersToTry = [peersNotForked[index], ...Utils.shuffle(peersNotForked.slice(chunksToDownload))];
				if (peersToTry.length === 1) {
					// special case where we don't have "backup peers" (that have not been first-attempt for any job)
					// so add peers that have been first-attempt as backup peers
					peersToTry.push(...peersNotForked.filter((p) => p.ip !== peersNotForked[index].ip));
				}

				for (peer of peersToTry) {
					peerPrint = `${peer.ip}:${peer.port}`;
					try {
						blocks = await this.communicator.getPeerBlocks(peer, {
							blockLimit: this.#downloadChunkSize,
							fromBlockHeight: height,
						});

						if (blocks.length > 0 || isLastChunk) {
							// when `isLastChunk` it can be normal that the peer does not send any block (when none were forged)
							this.logger.debug(
								`Downloaded blocks ${blocksRange} (${blocks.length}) ` + `from ${peerPrint}`,
							);
							downloadResults[index] = blocks;
							return;
						} else {
							throw new Error("Peer did not return any block");
						}
					} catch (error) {
						this.logger.info(
							`Failed to download blocks ${blocksRange} from ${peerPrint}: ${error.message}`,
						);
					}

					if (someJobFailed) {
						this.logger.info(
							`Giving up on trying to download blocks ${blocksRange}: ` + `another download job failed`,
						);
					}
				}

				someJobFailed = true;
				throw new Error(
					`Could not download blocks ${blocksRange} from any of ${peersToTry.length} ` +
						`peer(s). Last attempt returned ${blocks.length} block(s) from peer ${peerPrint}.`,
				);
			});

			if (chunksHumanReadable.length > 0) {
				chunksHumanReadable += ", ";
			}
			chunksHumanReadable += blocksRange;
		}

		this.logger.debug(`Downloading blocks in chunks: ${chunksHumanReadable}`);
		let firstFailureMessage!: string;

		try {
			// Convert the array of AsyncFunction to an array of Promise by calling the functions.
			// @ts-ignore
			await Promise.all(downloadJobs.map((f) => f()));
		} catch (error) {
			firstFailureMessage = error.message;
		}

		let downloadedBlocks: Contracts.Crypto.IBlockData[] = [];

		let index;

		for (index = 0; index < chunksToDownload; index++) {
			if (downloadResults[index] === undefined) {
				this.logger.error(firstFailureMessage);
				break;
			}
			downloadedBlocks = [...downloadedBlocks, ...downloadResults[index]];
		}
		// Save any downloaded chunks that are higher than a failed chunk for later reuse.
		for (index++; index < chunksToDownload; index++) {
			if (downloadResults[index]) {
				const height: number = fromBlockHeight + this.#downloadChunkSize * index;
				const blocksRange = `[${(height + 1).toLocaleString()}, ${(
					height + this.#downloadChunkSize
				).toLocaleString()}]`;

				this.chunkCache.set(blocksRange, downloadResults[index]);
			}
		}

		// if we did not manage to download any block, reduce chunk size for next time
		this.#downloadChunkSize =
			downloadedBlocks.length === 0 ? Math.ceil(this.#downloadChunkSize / 10) : defaultDownloadChunkSize;

		return downloadedBlocks;
	}

	public async broadcastBlock(block: Contracts.Crypto.IBlock): Promise<void> {
		const blockchain = this.app.get<Contracts.Blockchain.Blockchain>(Identifiers.BlockchainService);

		let blockPing = blockchain.getBlockPing();
		let peers: Contracts.P2P.Peer[] = this.repository.getPeers();

		if (blockPing && blockPing.block.id === block.data.id && !blockPing.fromForger) {
			// wait a bit before broadcasting if a bit early
			const diff = blockPing.last - blockPing.first;
			const maxHop = 4;
			let broadcastQuota: number = (maxHop - blockPing.count) / maxHop;

			if (diff < 500 && broadcastQuota > 0) {
				await Utils.sleep(500 - diff);

				blockPing = blockchain.getBlockPing()!;

				// got aleady a new block, no broadcast
				if (blockPing.block.height !== block.data.height) {
					return;
				}

				broadcastQuota = (maxHop - blockPing.count) / maxHop;
			}

			peers = broadcastQuota <= 0 ? [] : Utils.shuffle(peers).slice(0, Math.ceil(broadcastQuota * peers.length));
			// select a portion of our peers according to quota calculated before
		}

		this.logger.info(
			`Broadcasting block ${block.data.height.toLocaleString()} to ${Utils.pluralize(
				"peer",
				peers.length,
				true,
			)}`,
		);

		await Promise.all(peers.map((peer) => this.communicator.postBlock(peer, block)));
	}

	async #pingPeerPorts(pingAll?: boolean): Promise<void> {
		let peers = this.repository.getPeers();
		if (!pingAll) {
			peers = Utils.shuffle(peers).slice(0, Math.floor(peers.length / 2));
		}

		this.logger.debug(`Checking ports of ${Utils.pluralize("peer", peers.length, true)}.`);

		await Promise.all(peers.map((peer) => this.communicator.pingPorts(peer)));
	}

	async #scheduleUpdateNetworkStatus(nextUpdateInSeconds): Promise<void> {
		if (this.nextUpdateNetworkStatusScheduled) {
			return;
		}

		this.nextUpdateNetworkStatusScheduled = true;

		await Utils.sleep(nextUpdateInSeconds * 1000);

		this.nextUpdateNetworkStatusScheduled = false;

		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		this.updateNetworkStatus();
	}

	#hasMinimumPeers(): boolean {
		if (this.config.ignoreMinimumNetworkReach) {
			this.logger.warning("Ignored the minimum network reach because the relay is in seed mode.");

			return true;
		}

		return Object.keys(this.repository.getPeers()).length >= this.config.minimumNetworkReach;
	}

	async #populateSeedPeers(): Promise<any> {
		const peerList: Contracts.P2P.PeerData[] = this.app.config("peers").list;

		try {
			const peersFromUrl = await this.#loadPeersFromUrlList();
			for (const peer of peersFromUrl) {
				if (!peerList.find((p) => p.ip === peer.ip)) {
					peerList.push({
						ip: peer.ip,
						port: peer.port,
					});
				}
			}
		} catch {}

		if (!peerList || peerList.length === 0) {
			// eslint-disable-next-line @typescript-eslint/no-floating-promises
			this.app.terminate("No seed peers defined in peers.json");
		}

		const peers: Contracts.P2P.Peer[] = peerList.map((peer) => {
			const peerInstance = new Peer(peer.ip, peer.port);
			peerInstance.version = this.app.version();
			return peerInstance;
		});

		return Promise.all(
			// @ts-ignore
			Object.values(peers).map((peer: Contracts.P2P.Peer) => {
				this.repository.forgetPeer(peer);

				return this.app
					.get<Services.Triggers.Triggers>(Identifiers.TriggerService)
					.call("validateAndAcceptPeer", { options: { lessVerbose: true, seed: true }, peer });
			}),
		);
	}

	async #loadPeersFromUrlList(): Promise<Array<{ ip: string; port: number }>> {
		const urls: string[] = this.app.config("peers").sources || [];

		for (const url of urls) {
			// Local File...
			if (url.startsWith("/")) {
				return require(url);
			}

			// URL...
			this.logger.debug(`GET ${url}`);
			const { data } = await Utils.http.get(url);
			return typeof data === "object" ? data : JSON.parse(data);
		}

		return [];
	}
}
