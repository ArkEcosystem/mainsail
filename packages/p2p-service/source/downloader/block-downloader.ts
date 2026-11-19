import type { Contracts } from "@mainsail/contracts";

import { Enums, Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { ensureError } from "@mainsail/utils";

import { constants } from "../constants.js";
import { getBlocksBudget } from "../routes/get-blocks.js";
import { getRandomPeer } from "../utils/index.js";

enum JobStatus {
	Downloading,
	ReadyToProcess,
	Processing,
}

type DownloadJob = {
	peer: Contracts.P2PService.Peer;
	blockNumberFrom: number;
	blockNumberTo: number;
	blocks: Buffer[];
	status: JobStatus;
};

@injectable()
export class BlockDownloader implements Contracts.P2PService.Downloader {
	@inject(Identifiers.P2P.Peer.Communicator)
	private readonly communicator!: Contracts.P2PService.PeerCommunicator;

	@inject(Identifiers.P2P.Peer.Repository)
	private readonly repository!: Contracts.P2PService.PeerRepository;

	@inject(Identifiers.P2P.Peer.Disposer)
	private readonly peerDisposer!: Contracts.P2PService.PeerDisposer;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.BlockchainUtils.RoundCalculator)
	private readonly roundCalculator!: Contracts.BlockchainUtils.RoundCalculator;

	@inject(Identifiers.State.Store)
	private readonly stateStore!: Contracts.State.Store;

	@inject(Identifiers.P2P.PendingCommits)
	private readonly pendingCommits!: Contracts.P2PService.PendingCommits;

	@inject(Identifiers.Consensus.Processor.Commit)
	private readonly commitProcessor!: Contracts.Consensus.CommitProcessor;

	@inject(Identifiers.Cryptography.Commit.Factory)
	private readonly commitFactory!: Contracts.Crypto.CommitFactory;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	#downloadJobs: DownloadJob[] = [];

	public download(peer: Contracts.P2PService.Peer): void {
		if (
			peer.header.blockNumber - 1 <= this.#getLastRequestedBlockNumber() ||
			this.#downloadJobs.length >= constants.MAX_DOWNLOAD_BLOCKS_JOBS
		) {
			return;
		}

		const downloadJob: DownloadJob = {
			blockNumberFrom: this.#getLastRequestedBlockNumber() + 1,
			blockNumberTo: this.#calculateBlockNumberTo(peer, this.#getLastRequestedBlockNumber()),
			blocks: [],
			peer,
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
			this.logger.debug(
				`Downloading blocks ${job.blockNumberFrom}-${job.blockNumberTo} from ${job.peer.ip}`,
				"p2p",
			);

			const result = await this.communicator.getBlocks(job.peer, {
				fromBlockNumber: job.blockNumberFrom,
				limit: job.blockNumberTo - job.blockNumberFrom + 1,
			});

			job.blocks = result.blocks;
			job.status = JobStatus.ReadyToProcess;
		} catch (rawError) {
			const error = ensureError(rawError);
			this.#handleJobError(job, error);
		}

		this.#processNextJob();
	}

	async #processBlocks(job: DownloadJob) {
		if (job.status !== JobStatus.ReadyToProcess) {
			return;
		}

		this.logger.debug(`Processing blocks ${job.blockNumberFrom}-${job.blockNumberTo} from ${job.peer.ip}`, "p2p");

		let number = job.blockNumberFrom;
		job.status = JobStatus.Processing;

		try {
			const bytesForProcess = [...job.blocks];

			const storedBlockNumber = this.stateStore.getBlockNumber();
			let previousBlockHash = this.stateStore.getLastBlock().hash;

			number = this.#skipAppliedBlocks(bytesForProcess, number, storedBlockNumber);

			while (bytesForProcess.length > 0) {
				const roundInfo = this.roundCalculator.calculateRound(number);

				// TODO: Check if can use workers
				// Slice to the end of the round, to ensure validator set is the same
				const commits = await Promise.all(
					bytesForProcess
						.splice(0, roundInfo.roundHeight + roundInfo.maxValidators - number)
						.map(async (buff) => await this.commitFactory.fromBytes(buff)),
				);

				await this.#verifyCommits(commits, number, previousBlockHash);

				this.pendingCommits.add(commits);

				for (const commit of commits) {
					this.pendingCommits.take(commit.block.number);

					const response = await this.commitProcessor.process(commit);
					if (response === Enums.Consensus.ProcessorResult.Invalid) {
						throw new Error(`Received block is invalid`);
					}

					number++;
					previousBlockHash = commit.block.hash;
				}
			}
		} catch (rawError) {
			const error = ensureError(rawError);
			this.#handleJobError(job, error);
			return;
		} finally {
			this.pendingCommits.clear();
		}

		if (job.blockNumberTo !== number - 1) {
			this.#handleMissingBlocks(job);
			return;
		}

		this.#downloadJobs.shift();
		this.#processNextJob();
	}

	// Checks a slice before any of it is processed: the block numbers must follow on from
	// `fromBlockNumber` and every commit must be signed. Each commit's precommit signature covers the
	// previous block hash, so verify against the actual predecessor in the chain never the store's last
	// block, which moves whenever consensus applies a block.
	async #verifyCommits(
		commits: Contracts.Crypto.Commit[],
		fromBlockNumber: number,
		previousBlockHash: string,
	): Promise<void> {
		for (const [index, commit] of commits.entries()) {
			if (commit.block.number !== fromBlockNumber + index) {
				throw new Error(
					`Received block number ${commit.block.number} does not match expected number ${
						fromBlockNumber + index
					}`,
				);
			}
		}

		const hasValidSignatures = await Promise.all(
			commits.map(
				async (commit, index) =>
					await this.commitProcessor.hasValidSignature(
						commit,
						index === 0 ? previousBlockHash : commits[index - 1].block.hash,
					),
			),
		);

		if (!hasValidSignatures.every(Boolean)) {
			throw new Error(`Received block(s) with invalid signature(s)`);
		}
	}

	// Drops leading blocks that are already applied (e.g. committed by live consensus while the job was in flight)
	// and returns the first block number left to process.
	#skipAppliedBlocks(bytesForProcess: Buffer[], fromBlockNumber: number, storedBlockNumber: number): number {
		if (fromBlockNumber > storedBlockNumber) {
			return fromBlockNumber;
		}

		const skipCount = Math.min(bytesForProcess.length, storedBlockNumber - fromBlockNumber + 1);
		bytesForProcess.splice(0, skipCount);

		return fromBlockNumber + skipCount;
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
			"p2p",
		);
		this.peerDisposer.banPeer(job.peer.ip, error);

		this.#replayJob(job);
	}

	// A peer returns fewer blocks than requested when the next one no longer fits its budget for the
	// response. It charges every block its transaction payload plus a fixed overhead, so what it charged
	// for this response and for the block it stopped at is at most the bytes received, that overhead per
	// block and one block of the largest payload. A response that stays within the budget even by this
	// upper bound had room for the next block: the peer withheld it.
	#handleMissingBlocks(job: DownloadJob): void {
		const { maxPayload } = this.configuration.getMilestone(this.stateStore.getBlockNumber() + 1).block;

		const size = job.blocks.reduce((size, block) => size + block.length, 0);
		const charged = size + maxPayload + (job.blocks.length + 1) * constants.COMMIT_BUDGET_OVERHEAD;

		if (charged <= getBlocksBudget(job.blockNumberTo - job.blockNumberFrom + 1)) {
			this.peerDisposer.banPeer(
				job.peer.ip,
				new Error("Peer didn't respond with all requested blocks and didn't exceed maxPayload"),
			);
		}

		this.#replayJob(job);
	}

	#replayJob(job: DownloadJob) {
		const index = this.#downloadJobs.indexOf(job);
		if (index === -1) {
			return; // Job was already removed
		}

		const isFirstJob = index === 0;
		const isSoleJob = this.#downloadJobs.length === 1;
		const blockNumberFrom = isFirstJob ? this.stateStore.getBlockNumber() + 1 : job.blockNumberFrom;

		// A sole job may shrink to whatever the new peer can serve; a job with successors must
		// keep its exact range so the requested ranges stay contiguous.
		const requiredBlockNumber = isSoleJob ? blockNumberFrom : Math.max(blockNumberFrom, job.blockNumberTo);

		const peers = this.repository.getActivePeers().filter((peer) => peer.header.blockNumber > requiredBlockNumber);

		if (peers.length === 0) {
			// Remove higher jobs, because peer is no longer available
			this.#downloadJobs = this.#downloadJobs.slice(0, index);
			return;
		}

		const peer = getRandomPeer(peers);

		const blockNumberTo = isSoleJob ? this.#calculateBlockNumberTo(peer, blockNumberFrom - 1) : job.blockNumberTo;

		// Skip if blockNumberFrom is higher than blockNumberTo
		if (isFirstJob && blockNumberFrom > blockNumberTo) {
			this.#downloadJobs.shift();
			this.#processNextJob();
			return;
		}

		const newJob: DownloadJob = {
			blockNumberFrom,
			blockNumberTo,
			blocks: [],
			peer,
			status: JobStatus.Downloading,
		};

		this.#downloadJobs[index] = newJob;

		void this.#downloadBlocksFromPeer(newJob);
	}

	#calculateBlockNumberTo(peer: Contracts.P2PService.Peer, lastRequestedBlockNumber: number): number {
		// Check that we don't exceed maxDownloadBlocks
		return peer.header.blockNumber - lastRequestedBlockNumber > constants.MAX_DOWNLOAD_BLOCKS
			? lastRequestedBlockNumber + constants.MAX_DOWNLOAD_BLOCKS
			: peer.header.blockNumber - 1; // Stored block number is always 1 less than the consensus block number
	}
}
