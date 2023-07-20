import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

type DownloadJob = {
	peer: Contracts.P2P.Peer;
	peerHeight: number;
	heightFrom: number;
	heightTo: number;
	blocks: Buffer[];
};

@injectable()
export class BlockDownloader {
	@inject(Identifiers.PeerCommunicator)
	private readonly communicator!: Contracts.P2P.PeerCommunicator;

	@inject(Identifiers.StateStore)
	private readonly stateStore!: Contracts.State.StateStore;

	@inject(Identifiers.Cryptography.Block.Factory)
	private readonly blockFactory!: Contracts.Crypto.IBlockFactory;

	@inject(Identifiers.Consensus.Handler)
	private readonly handler!: Contracts.Consensus.IHandler;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	#downloadJobs: DownloadJob[] = [];
	#isProcessing = false;

	public downloadBlocks(peer: Contracts.P2P.Peer): void {
		if (peer.state.height <= this.#getLastRequestedBlockHeight()) {
			return;
		}

		const downloadJob: DownloadJob = {
			blocks: [],
			heightFrom: this.#getLastRequestedBlockHeight() + 1,
			heightTo: peer.state.height,
			peer,
			peerHeight: peer.state.height,
		};

		this.#downloadJobs.push(downloadJob);

		void this.#downloadBlocksFromPeer(downloadJob);
	}

	#getLastRequestedBlockHeight(): number {
		return this.stateStore.getLastHeight();
	}

	async #downloadBlocksFromPeer(job: DownloadJob): Promise<void> {
		try {
			this.logger.debug(`Downloading blocks ${job.heightFrom}-${job.heightTo} from ${job.peer.ip}`);

			const result = await this.communicator.getBlocks(job.peer, {
				fromHeight: job.heightFrom,
				limit: job.heightTo - job.heightFrom + 1,
			});

			job.blocks = result.blocks;
		} catch (error) {
			this.logger.debug(
				`Error downloading blocks ${job.heightFrom}-${job.heightTo} from ${job.peer.ip}. Message: ${error.message}`,
			);

			// TODO: Handle errors
		}

		// TODO: Handle missing blocks
		this.#processNextJob();
	}

	async #processBlocks(job: DownloadJob) {
		this.logger.debug(`Processing blocks ${job.heightFrom}-${job.heightTo} from ${job.peer.ip}`);

		try {
			for (const buff of job.blocks) {
				const block = await this.blockFactory.fromCommittedBytes(buff);

				// TODO: Handle response
				await this.handler.onCommittedBlock(block);
			}

			this.#isProcessing = false;
		} catch (error) {
			this.logger.error(
				`Error processing blocks ${job.heightFrom}-${job.heightTo} from ${job.peer.ip}. Message: ${error.message}`,
			);

			// TODO: Handle errors
		}

		this.#processNextJob();
	}

	#processNextJob(): void {
		if (this.#isProcessing || this.#downloadJobs.length === 0 || this.#downloadJobs[0].blocks.length === 0) {
			return;
		}

		void this.#processBlocks(this.#downloadJobs[0]);
	}
}
