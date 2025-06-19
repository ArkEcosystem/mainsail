import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { constants } from "../constants.js";
import { getRandomPeer } from "../utils/index.js";

enum JobStatus {
	Downloading,
	ReadyToProcess,
	Processing,
}

type DownloadJob = {
	peer: Contracts.P2P.Peer;
	peerBlockNumber: number;
	blockNumberFrom: number;
	blockNumberTo: number;
	blocks: Buffer[];
	status: JobStatus;
};

@injectable()
export class BlockDownloader implements Contracts.P2P.Downloader {
	@inject(Identifiers.P2P.Peer.Communicator)
	private readonly communicator!: Contracts.P2P.PeerCommunicator;

	@inject(Identifiers.P2P.Peer.Repository)
	private readonly repository!: Contracts.P2P.PeerRepository;

	@inject(Identifiers.P2P.Peer.Disposer)
	private readonly peerDisposer!: Contracts.P2P.PeerDisposer;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.BlockchainUtils.RoundCalculator)
	private readonly roundCalculator!: Contracts.BlockchainUtils.RoundCalculator;

	@inject(Identifiers.State.Store)
	private readonly stateStore!: Contracts.State.Store;

	@inject(Identifiers.P2P.State)
	private readonly state!: Contracts.P2P.State;

	@inject(Identifiers.Consensus.Processor.Commit)
	private readonly commitProcessor!: Contracts.Consensus.CommitProcessor;

	@inject(Identifiers.Cryptography.Commit.Factory)
	private readonly commitFactory!: Contracts.Crypto.CommitFactory;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	#downloadJobs: DownloadJob[] = [];

	public tryToDownload(): void {
		let peers = this.repository.getPeers();

		while (
			(peers = peers.filter((peer) => peer.header.blockNumber > this.#getLastRequestedBlockNumber())) &&
			peers.length > 0
		) {
			this.download(getRandomPeer(peers));
		}
	}

	public download(peer: Contracts.P2P.Peer): void {
		if (
			peer.header.blockNumber - 1 <= this.#getLastRequestedBlockNumber() ||
			this.#downloadJobs.length >= constants.MAX_DOWNLOAD_BLOCKS_JOBS
		) {
			return;
		}

		const downloadJob: DownloadJob = {
			blockNumberFrom: this.#getLastRequestedBlockNumber() + 1,
			blockNumberTo: this.#calculateBlockNumberTo(peer),
			blocks: [],
			peer,
			peerBlockNumber: peer.header.blockNumber - 1,
			status: JobStatus.Downloading,
		};

		this.#downloadJobs.push(downloadJob);

		void this.#downloadBlocksFromPeer(downloadJob);
	}

	public isDownloading(): boolean {
		return this.#downloadJobs.length > 0;
	}

	#getLastRequestedBlockNumber(): number {
		const latestJob = this.#downloadJobs.at(-1);
		if (latestJob === undefined) {
			return this.stateStore.getBlockNumber();
		}

		return latestJob.blockNumberTo;
	}

	async #downloadBlocksFromPeer(job: DownloadJob): Promise<void> {
		try {
			this.logger.debug(`Downloading blocks ${job.blockNumberFrom}-${job.blockNumberTo} from ${job.peer.ip}`);

			const result = await this.communicator.getBlocks(job.peer, {
				fromBlockNumber: job.blockNumberFrom,
				limit: job.blockNumberTo - job.blockNumberFrom + 1,
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

		this.logger.debug(`Processing blocks ${job.blockNumberFrom}-${job.blockNumberTo} from ${job.peer.ip}`);

		let number = job.blockNumberFrom;
		job.status = JobStatus.Processing;

		try {
			const bytesForProcess = [...job.blocks];

			while (bytesForProcess.length > 0) {
				const roundInfo = this.roundCalculator.calculateRound(number);

				// TODO: Check if can use workers
				// Slice to the end of the round, to ensure validator set is the same
				const commits = await Promise.all(
					bytesForProcess
						.splice(0, roundInfo.roundHeight + roundInfo.maxValidators - number)
						.map(async (buff) => await this.commitFactory.fromBytes(buff)),
				);

				// Check blocks
				for (const [index, commit] of commits.entries()) {
					if (commit.block.data.number !== number + index) {
						throw new Error(
							`Received block number ${commit.block.data.number} does not match expected number ${
								number + index
							}`,
						);
					}
				}

				const hasValidSignatures = await Promise.all(
					commits.map(async (commit) => await this.commitProcessor.hasValidSignature(commit)),
				);

				if (!hasValidSignatures.every(Boolean)) {
					throw new Error(`Received block(s) with invalid signature(s)`);
				}

				for (const commit of commits) {
					const response = await this.commitProcessor.process(commit);
					if (response === Contracts.Consensus.ProcessorResult.Invalid) {
						throw new Error(`Received block is invalid`);
					}

					number++;
				}
			}

			this.state.resetLastMessageTime();
		} catch (error) {
			this.#handleJobError(job, error);
			return;
		}

		if (job.blockNumberTo !== number - 1) {
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
			`Error ${job.status === JobStatus.Downloading ? "downloading" : "processing"} blocks ${job.blockNumberFrom}-${
				job.blockNumberTo
			} from ${job.peer.ip}. ${error.message}`,
		);
		this.peerDisposer.banPeer(job.peer.ip, error);

		this.#replyJob(job);
	}

	#handleMissingBlocks(job: DownloadJob): void {
		const configuration = this.configuration.getMilestone(this.stateStore.getBlockNumber() + 1);

		const size = job.blocks.reduce((size, block) => size + block.length, 0);

		// TODO: Take header size into account
		if (size + configuration.block.maxPayload < constants.MAX_PAYLOAD_CLIENT) {
			// Peer did't respond with all requested blocks and didn't exceed maxPayload
			this.peerDisposer.banPeer(
				job.peer.ip,
				new Error("Peer didn't respond with all requested blocks and didn't exceed maxPayload"),
			);
		}

		this.#replyJob(job);
	}

	#replyJob(job: DownloadJob) {
		const index = this.#downloadJobs.indexOf(job);
		if (index === -1) {
			return; // Job was already removed
		}

		const isFirstJob = index === 0;
		const blockNumberFrom = isFirstJob ? this.stateStore.getBlockNumber() + 1 : job.blockNumberFrom;

		// Skip if next job is higher than current block number
		if (
			isFirstJob &&
			this.#downloadJobs.length > 1 &&
			this.#downloadJobs[1].blockNumberFrom > this.stateStore.getBlockNumber()
		) {
			this.#downloadJobs.shift();
			return;
		}

		const peers = this.repository
			.getPeers()
			.filter((peer) => peer.header.blockNumber > Math.max(blockNumberFrom, job.blockNumberTo));

		if (peers.length === 0) {
			// Remove higher jobs, because peer is no longer available
			this.#downloadJobs = this.#downloadJobs.slice(0, index);
			return;
		}

		const peer = getRandomPeer(peers);

		const blockNumberTo = this.#downloadJobs.length === 1 ? this.#calculateBlockNumberTo(peer) : job.blockNumberTo;

		// Skip if blockNumberFrom is higher than blockNumberTo
		if (isFirstJob && blockNumberFrom > blockNumberTo) {
			this.#downloadJobs.shift();
			return;
		}

		const newJob: DownloadJob = {
			blockNumberFrom,
			blockNumberTo,
			blocks: [],
			peer,
			peerBlockNumber: peer.header.blockNumber - 1,
			status: JobStatus.Downloading,
		};

		this.#downloadJobs[index] = newJob;

		void this.#downloadBlocksFromPeer(newJob);
	}

	#calculateBlockNumberTo(peer: Contracts.P2P.Peer): number {
		// Check that we don't exceed maxDownloadBlocks
		return peer.header.blockNumber - this.#getLastRequestedBlockNumber() > constants.MAX_DOWNLOAD_BLOCKS
			? this.#getLastRequestedBlockNumber() + constants.MAX_DOWNLOAD_BLOCKS
			: peer.header.blockNumber - 1; // Stored block number is always 1 less than the consensus block number
	}
}
