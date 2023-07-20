/* eslint-disable sonarjs/no-one-iteration-loop */
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

import { constants } from "./constants";

@injectable()
export class BlockDownloader implements Contracts.P2P.BlockDownloader {
	@inject(Identifiers.PeerNetworkMonitor)
	private readonly networkMonitor!: Contracts.P2P.NetworkMonitor;

	@inject(Identifiers.PeerRepository)
	private readonly repository!: Contracts.P2P.PeerRepository;

	@inject(Identifiers.PeerCommunicator)
	private readonly communicator!: Contracts.P2P.PeerCommunicator;

	@inject(Identifiers.PeerChunkCache)
	private readonly chunkCache!: Contracts.P2P.ChunkCache;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	#downloadChunkSize = constants.MAX_DOWNLOAD_BLOCKS;
	#maxParallelDownloads = 10;

	public async downloadBlocksFromHeight(fromBlockHeight: number): Promise<Contracts.Crypto.IBlockData[]> {
		return [];

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

		const networkHeight: number = this.networkMonitor.getNetworkHeight();
		let chunksMissingToSync: number;

		if (!networkHeight || networkHeight <= fromBlockHeight) {
			chunksMissingToSync = 1;
		} else {
			chunksMissingToSync = Math.ceil((networkHeight - fromBlockHeight) / this.#downloadChunkSize);
		}
		const chunksToDownload: number = Math.min(
			chunksMissingToSync,
			peersNotForked.length,
			this.#maxParallelDownloads,
		);

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
						// TODO: Blocks are now buffers
						blocks = (await this.communicator.getBlocks(peer, {
							fromHeight: height,
							limit: this.#downloadChunkSize,
						})) as any;

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
			downloadedBlocks.length === 0 ? Math.ceil(this.#downloadChunkSize / 10) : constants.MAX_DOWNLOAD_BLOCKS;

		return downloadedBlocks;
	}
}
