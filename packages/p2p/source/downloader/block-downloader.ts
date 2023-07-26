import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { constants } from "../constants";
import { getRandomPeer } from "../utils";

enum JobStatus {
	Downloading,
	ReadyToProcess,
	Processing,
}

type DownloadJob = {
	peer: Contracts.P2P.Peer;
	peerHeight: number;
	heightFrom: number;
	heightTo: number;
	blocks: Buffer[];
	status: JobStatus;
};

@injectable()
export class BlockDownloader implements Contracts.P2P.Downloader {
	@inject(Identifiers.PeerCommunicator)
	private readonly communicator!: Contracts.P2P.PeerCommunicator;

	@inject(Identifiers.PeerRepository)
	private readonly repository!: Contracts.P2P.PeerRepository;

	@inject(Identifiers.PeerBlocker)
	private readonly peerBlocker!: Contracts.P2P.PeerBlocker;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.StateStore)
	private readonly stateStore!: Contracts.State.StateStore;

	@inject(Identifiers.Cryptography.Block.Factory)
	private readonly blockFactory!: Contracts.Crypto.IBlockFactory;

	@inject(Identifiers.Consensus.Handler)
	private readonly handler!: Contracts.Consensus.IHandler;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	#downloadJobs: DownloadJob[] = [];

	public tryToDownload(): void {
		let peers = this.repository.getPeers();

		while (
			(peers = peers.filter((peer) => peer.state.height > this.#getLastRequestedBlockHeight())) &&
			peers.length > 0
		) {
			void this.download(getRandomPeer(peers));
		}
	}

	public download(peer: Contracts.P2P.Peer): void {
		if (
			peer.state.height - 1 <= this.#getLastRequestedBlockHeight() ||
			this.#downloadJobs.length >= constants.MAX_DOWNLOAD_BLOCKS_JOBS
		) {
			return;
		}

		const downloadJob: DownloadJob = {
			blocks: [],
			heightFrom: this.#getLastRequestedBlockHeight() + 1,
			heightTo: this.#calculateHeightTo(peer),
			peer,
			peerHeight: peer.state.height - 1,
			status: JobStatus.Downloading,
		};

		this.#downloadJobs.push(downloadJob);

		void this.#downloadBlocksFromPeer(downloadJob);
	}

	public isDownloading(): boolean {
		return this.#downloadJobs.length > 0;
	}

	#getLastRequestedBlockHeight(): number {
		if (this.#downloadJobs.length === 0) {
			return this.stateStore.getLastHeight();
		}

		return this.#downloadJobs[this.#downloadJobs.length - 1].heightTo;
	}

	async #downloadBlocksFromPeer(job: DownloadJob): Promise<void> {
		try {
			this.logger.debug(`Downloading blocks ${job.heightFrom}-${job.heightTo} from ${job.peer.ip}`);

			const result = await this.communicator.getBlocks(job.peer, {
				fromHeight: job.heightFrom,
				limit: job.heightTo - job.heightFrom + 1,
			});

			job.blocks = result.blocks;
			job.status = JobStatus.ReadyToProcess;
		} catch (error) {
			this.#handleJobError(job, error);
		}

		this.#processNextJob();
	}

	async #processBlocks(job: DownloadJob) {
		if (job.status !== JobStatus.ReadyToProcess) {
			return;
		}

		this.logger.debug(`Processing blocks ${job.heightFrom}-${job.heightTo} from ${job.peer.ip}`);

		try {
			job.status = JobStatus.Processing;
			for (const buff of job.blocks) {
				const block = await this.blockFactory.fromCommittedBytes(buff);

				// TODO: Handle response
				await this.handler.onCommittedBlock(block);
			}
		} catch (error) {
			this.peerBlocker.blockPeer(job.peer);

			this.#handleJobError(job, error);
			return;
		}

		if (job.heightTo !== this.stateStore.getLastHeight()) {
			this.#handleMissingBlocks(job);
			return;
		}

		this.#downloadJobs.shift();
		this.#processNextJob();
	}

	#processNextJob(): void {
		if (this.#downloadJobs.length === 0) {
			return;
		}

		void this.#processBlocks(this.#downloadJobs[0]);
	}

	#handleJobError(job: DownloadJob, error: Error): void {
		const index = this.#downloadJobs.indexOf(job);
		if (index === -1) {
			return; // Job was already removed
		}

		this.logger.debug(
			`Error ${job.status === JobStatus.Downloading ? "downloading" : "processing"} blocks ${job.heightFrom}-${
				job.heightTo
			} from ${job.peer.ip}. ${error.message}`,
		);

		this.#replyJob(job);
	}

	#handleMissingBlocks(job: DownloadJob): void {
		const configuration = this.configuration.getMilestone(this.stateStore.getLastHeight() + 1);

		const size = job.blocks.reduce((size, block) => size + block.length, 0);

		// TODO: Take header size into account
		if (size + configuration.block.maxPayload < constants.DEFAULT_MAX_PAYLOAD) {
			// Peer did't respond with all requested blocks and didn't exceed maxPayload
			this.peerBlocker.blockPeer(job.peer);
		}

		this.#replyJob(job);
	}

	#replyJob(job: DownloadJob) {
		const index = this.#downloadJobs.indexOf(job);

		const peers = this.repository.getPeers().filter((peer) => peer.state.height >= job.heightTo);

		if (peers.length === 0) {
			// Remove higher jobs, because peer is no longer available
			this.#downloadJobs = this.#downloadJobs.slice(0, index);
			return;
		}

		const peer = getRandomPeer(peers);

		const newJob: DownloadJob = {
			blocks: [],
			heightFrom: index === 0 ? this.stateStore.getLastHeight() + 1 : job.heightFrom,
			heightTo: this.#downloadJobs.length === 1 ? this.#calculateHeightTo(peer) : job.heightTo,
			peer,
			peerHeight: peer.state.height - 1,
			status: JobStatus.Downloading,
		};

		this.#downloadJobs[index] = newJob;

		void this.#downloadBlocksFromPeer(newJob);
	}

	#calculateHeightTo(peer: Contracts.P2P.Peer): number {
		// Check that we don't exceed maxDownloadBlocks
		return peer.state.height - this.#getLastRequestedBlockHeight() > constants.MAX_DOWNLOAD_BLOCKS
			? this.#getLastRequestedBlockHeight() + constants.MAX_DOWNLOAD_BLOCKS
			: peer.state.height - 1; // Stored block height is always 1 less than the consensus height
	}
}
