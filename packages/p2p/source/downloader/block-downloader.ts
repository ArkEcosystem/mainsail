import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

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
	@inject(Identifiers.Database.Service)
	private readonly database!: Contracts.Database.IDatabaseService;

	@inject(Identifiers.PeerCommunicator)
	private readonly communicator!: Contracts.P2P.PeerCommunicator;

	@inject(Identifiers.PeerRepository)
	private readonly repository!: Contracts.P2P.PeerRepository;

	@inject(Identifiers.PeerDisposer)
	private readonly peerDisposer!: Contracts.P2P.PeerDisposer;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.StateService)
	private readonly stateService!: Contracts.State.Service;

	@inject(Identifiers.P2PState)
	private readonly state!: Contracts.P2P.State;

	@inject(Identifiers.Consensus.CommittedBlockProcessor)
	private readonly committedBlockProcessor!: Contracts.Consensus.ICommittedBlockProcessor;

	@inject(Identifiers.Cryptography.Block.Factory)
	private readonly blockFactory!: Contracts.Crypto.IBlockFactory;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	#downloadJobs: DownloadJob[] = [];

	public tryToDownload(): void {
		let peers = this.repository.getPeers();

		while (
			(peers = peers.filter((peer) => peer.header.height > this.#getLastRequestedBlockHeight())) &&
			peers.length > 0
		) {
			void this.download(getRandomPeer(peers));
		}
	}

	public download(peer: Contracts.P2P.Peer): void {
		if (
			peer.header.height - 1 <= this.#getLastRequestedBlockHeight() ||
			this.#downloadJobs.length >= constants.MAX_DOWNLOAD_BLOCKS_JOBS
		) {
			return;
		}

		const downloadJob: DownloadJob = {
			blocks: [],
			heightFrom: this.#getLastRequestedBlockHeight() + 1,
			heightTo: this.#calculateHeightTo(peer),
			peer,
			peerHeight: peer.header.height - 1,
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
			return this.stateService.getStateStore().getLastHeight();
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

		let height = job.heightFrom;
		job.status = JobStatus.Processing;

		try {
			const bytesForProcess = [...job.blocks];

			while (bytesForProcess.length > 0) {
				const roundInfo = Utils.roundCalculator.calculateRound(height, this.configuration);

				// TODO: Check if can use workers
				// Slice to the end of the round, to ensure validator set is the same
				const committedBlocks = await Promise.all(
					bytesForProcess
						.splice(0, roundInfo.roundHeight + roundInfo.maxValidators - height)
						.map(async (buff) => await this.blockFactory.fromCommittedBytes(buff)),
				);

				// Check heights
				for (const [index, committedBlock] of committedBlocks.entries()) {
					if (committedBlock.block.data.height !== height + index) {
						throw new Error(
							`Received block height ${committedBlock.block.data.height} does not match expected height ${
								height + index
							}`,
						);
					}
				}

				const hasValidSignatures = await Promise.all(
					committedBlocks.map(
						async (committedBlock) => await this.committedBlockProcessor.hasValidSignature(committedBlock),
					),
				);
				if (hasValidSignatures.some((value) => !value)) {
					throw new Error(`Received block has invalid signature`);
				}

				for (const committedBlock of committedBlocks) {
					const response = await this.committedBlockProcessor.process(committedBlock);
					if (response === Contracts.Consensus.ProcessorResult.Invalid) {
						throw new Error(`Received block is invalid`);
					}

					height++;
				}
			}

			this.state.resetLastMessageTime();
		} catch (error) {
			this.#handleJobError(job, error);
			return;
		} finally {
			await this.database.persist();
		}

		await new Promise((resolve) => setTimeout(resolve, 10_000));

		if (job.heightTo !== height - 1) {
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
		this.peerDisposer.banPeer(job.peer.ip, error);

		this.#replyJob(job);
	}

	#handleMissingBlocks(job: DownloadJob): void {
		const configuration = this.configuration.getMilestone(this.stateService.getStateStore().getLastHeight() + 1);

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

		const peers = this.repository.getPeers().filter((peer) => peer.header.height >= job.heightTo);

		if (peers.length === 0) {
			// Remove higher jobs, because peer is no longer available
			this.#downloadJobs = this.#downloadJobs.slice(0, index);
			return;
		}

		const peer = getRandomPeer(peers);

		const newJob: DownloadJob = {
			blocks: [],
			heightFrom: index === 0 ? this.stateService.getStateStore().getLastHeight() + 1 : job.heightFrom,
			heightTo: this.#downloadJobs.length === 1 ? this.#calculateHeightTo(peer) : job.heightTo,
			peer,
			peerHeight: peer.header.height - 1,
			status: JobStatus.Downloading,
		};

		this.#downloadJobs[index] = newJob;

		void this.#downloadBlocksFromPeer(newJob);
	}

	#calculateHeightTo(peer: Contracts.P2P.Peer): number {
		// Check that we don't exceed maxDownloadBlocks
		return peer.header.height - this.#getLastRequestedBlockHeight() > constants.MAX_DOWNLOAD_BLOCKS
			? this.#getLastRequestedBlockHeight() + constants.MAX_DOWNLOAD_BLOCKS
			: peer.header.height - 1; // Stored block height is always 1 less than the consensus height
	}
}
