import { inject, injectable, postConstruct } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Enums } from "@mainsail/kernel";

import { getRandomPeer } from "../utils";

type DownloadsByHeight = {
	precommits: boolean[];
	prevotes: boolean[];
};

type DownloadJob = {
	peer: Contracts.P2P.Peer;
	height: number;
	prevoteIndexes: number[];
	precommitIndexes: number[];
};

@injectable()
export class MessageDownloader implements Contracts.P2P.Downloader {
	@inject(Identifiers.PeerCommunicator)
	private readonly communicator!: Contracts.P2P.PeerCommunicator;

	@inject(Identifiers.PeerRepository)
	private readonly repository!: Contracts.P2P.PeerRepository;

	@inject(Identifiers.PeerHeaderFactory)
	private readonly headerFactory!: Contracts.P2P.HeaderFactory;

	@inject(Identifiers.PeerBlockDownloader)
	private readonly blockDownloader!: Contracts.P2P.Downloader;

	@inject(Identifiers.PeerDisposer)
	private readonly peerDisposer!: Contracts.P2P.PeerDisposer;

	@inject(Identifiers.Consensus.PrevoteProcessor)
	private readonly prevoteProcessor!: Contracts.Consensus.IPrevoteProcessor;

	@inject(Identifiers.Consensus.PrecommitProcessor)
	private readonly precommitProcessor!: Contracts.Consensus.IProcessor;

	@inject(Identifiers.Cryptography.Message.Factory)
	private readonly factory!: Contracts.Crypto.IMessageFactory;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly cryptoConfiguration!: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.EventDispatcherService)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.StateStore)
	private readonly state!: Contracts.State.StateStore;

	#downloadsByHeight = new Map<number, DownloadsByHeight>();

	@postConstruct()
	public initialize(): void {
		this.events.listen(Enums.BlockEvent.Applied, {
			handle: () => {
				this.#downloadsByHeight.delete(this.state.getLastHeight());
			},
		});
	}

	public tryToDownload(): void {
		if (this.blockDownloader.isDownloading()) {
			return;
		}

		const header = this.headerFactory();
		let peers = this.repository.getPeers();

		while ((peers = peers.filter((peer) => header.canDownloadMessages(peer.state))) && peers.length > 0) {
			void this.download(getRandomPeer(peers));
		}
	}

	public download(peer: Contracts.P2P.Peer): void {
		if (this.blockDownloader.isDownloading()) {
			return;
		}

		const header = this.headerFactory();
		if (!header.canDownloadMessages(peer.state)) {
			return;
		}

		const downloads = this.#getDownloadsByHeight(peer.state.height);

		const prevoteIndexes = this.#getPrevoteIndexesToDownload(peer, downloads.prevotes);
		const precommitIndexes = this.#getPrecommitIndexesToDownload(peer, downloads.precommits);

		if (prevoteIndexes.length === 0 && precommitIndexes.length === 0) {
			return;
		}

		const job: DownloadJob = {
			height: peer.state.height,
			peer,
			precommitIndexes,
			prevoteIndexes,
		};

		this.#setDownloadJob(job, downloads);
		void this.#downloadMessagesFromPeer(job);
	}

	public isDownloading(): boolean {
		return this.#downloadsByHeight.size > 0;
	}

	#getDownloadsByHeight(height: number): DownloadsByHeight {
		if (!this.#downloadsByHeight.has(height)) {
			this.#downloadsByHeight.set(height, {
				precommits: Array.from<boolean>({
					length: this.cryptoConfiguration.getMilestone().activeValidators,
				}).fill(false),
				prevotes: Array.from<boolean>({
					length: this.cryptoConfiguration.getMilestone().activeValidators,
				}).fill(false),
			});
		}

		return this.#downloadsByHeight.get(height)!;
	}

	async #downloadMessagesFromPeer(job: DownloadJob): Promise<void> {
		let error: Error | undefined;

		try {
			const result = await this.communicator.getMessages(job.peer);

			for (const prevoteBuffer of result.prevotes) {
				// TODO: handle response
				const prevote = await this.factory.makePrevoteFromBytes(prevoteBuffer);
				await this.prevoteProcessor.process(prevote, false);
			}

			for (const precommitBuffer of result.precommits) {
				// TODO: handle response
				await this.precommitProcessor.process(precommitBuffer, false);
			}
		} catch (error_) {
			error = error_;
		}

		this.#removeDownloadJob(job);

		if (error) {
			this.peerDisposer.banPeer(job.peer, `Error downloading or processing messages - ${error.message}}`);
			this.tryToDownload();
		}
	}

	#setDownloadJob(job: DownloadJob, downloadsByHeight: DownloadsByHeight): void {
		for (const index of job.prevoteIndexes) {
			downloadsByHeight.prevotes[index] = true;
		}

		for (const index of job.precommitIndexes) {
			downloadsByHeight.precommits[index] = true;
		}
	}

	#removeDownloadJob(job: DownloadJob): void {
		// Return if the height was already removed, because the block was applied.
		if (!this.#downloadsByHeight.has(job.height)) {
			return;
		}

		const downloadsByHeight = this.#downloadsByHeight.get(job.height)!;

		for (const index of job.prevoteIndexes) {
			downloadsByHeight.prevotes[index] = false;
		}

		for (const index of job.precommitIndexes) {
			downloadsByHeight.precommits[index] = false;
		}
	}

	#getPrevoteIndexesToDownload(peer: Contracts.P2P.Peer, prevotes: boolean[]): number[] {
		const indexes: number[] = [];

		const header = this.headerFactory();
		for (const [index, prevote] of prevotes.entries()) {
			if (
				peer.state.validatorsSignedPrevote[index] &&
				!prevote &&
				!header.roundState.getValidatorsSignedPrevote()[index]
			) {
				indexes.push(index);
			}
		}

		return indexes;
	}

	#getPrecommitIndexesToDownload(peer: Contracts.P2P.Peer, precommits: boolean[]): number[] {
		const indexes: number[] = [];

		const header = this.headerFactory();
		for (const [index, precommit] of precommits.entries()) {
			if (
				peer.state.validatorsSignedPrecommit[index] &&
				!precommit &&
				!header.roundState.getValidatorsSignedPrecommit()[index]
			) {
				indexes.push(index);
			}
		}

		return indexes;
	}
}
