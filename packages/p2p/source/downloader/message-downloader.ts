import { inject, injectable, postConstruct } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Enums, Utils } from "@mainsail/kernel";

import { getRandomPeer } from "../utils";

type DownloadsByHeight = {
	precommits: boolean[];
	prevotes: boolean[];
};

type DownloadJob = {
	peer: Contracts.P2P.Peer;
	peerHeader: Contracts.P2P.IHeaderData;
	ourHeader: Contracts.P2P.IHeader;
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
	private readonly precommitProcessor!: Contracts.Consensus.IPrecommitProcessor;

	@inject(Identifiers.Cryptography.Message.Factory)
	private readonly factory!: Contracts.Crypto.IMessageFactory;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly cryptoConfiguration!: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.EventDispatcherService)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.StateStore)
	private readonly stateStore!: Contracts.State.StateStore;

	@inject(Identifiers.P2PState)
	private readonly state!: Contracts.P2P.State;

	#downloadsByHeight = new Map<number, DownloadsByHeight>();

	@postConstruct()
	public initialize(): void {
		this.events.listen(Enums.BlockEvent.Applied, {
			handle: () => {
				this.#downloadsByHeight.delete(this.stateStore.getLastHeight());
			},
		});
	}

	public tryToDownload(): void {
		if (this.blockDownloader.isDownloading()) {
			return;
		}

		const header = this.headerFactory();
		let peers = this.repository.getPeers();

		while ((peers = peers.filter((peer) => header.canDownloadMessages(peer.header))) && peers.length > 0) {
			void this.download(getRandomPeer(peers));
		}
	}

	public download(peer: Contracts.P2P.Peer): void {
		if (this.blockDownloader.isDownloading()) {
			return;
		}

		const header = this.headerFactory();
		if (!header.canDownloadMessages(peer.header)) {
			return;
		}

		const downloads = this.#getDownloadsByHeight(peer.header.height);

		const prevoteIndexes = this.#getPrevoteIndexesToDownload(peer, downloads.prevotes, header);
		const precommitIndexes = this.#getPrecommitIndexesToDownload(peer, downloads.precommits, header);

		if (prevoteIndexes.length === 0 && precommitIndexes.length === 0) {
			return;
		}

		const job: DownloadJob = {
			ourHeader: header,
			peer,
			peerHeader: peer.header,
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

			const prevotes: Map<number, Contracts.Crypto.IPrevote> = new Map();
			for (const buffer of result.prevotes) {
				const prevote = await this.factory.makePrevoteFromBytes(buffer);
				prevotes.set(prevote.validatorIndex, prevote);

				if (prevote.height !== job.ourHeader.height) {
					throw new Error(
						`Received prevote height ${prevote.height} does not match expected height ${job.peerHeader.height}`,
					);
				}

				if (prevote.round !== job.ourHeader.round) {
					throw new Error(
						`Received prevote round ${prevote.round} does not match expected round ${job.peerHeader.round}`,
					);
				}

				const response = await this.prevoteProcessor.process(prevote, false);

				if (response === Contracts.Consensus.ProcessorResult.Invalid) {
					throw new Error(`Received prevote is invalid`);
				}
			}

			const precommits: Map<number, Contracts.Crypto.IPrecommit> = new Map();
			for (const buffer of result.precommits) {
				const precommit = await this.factory.makePrecommitFromBytes(buffer);
				precommits.set(precommit.validatorIndex, precommit);

				if (precommit.height !== job.ourHeader.height) {
					throw new Error(
						`Received precommit height ${precommit.height} does not match expected height ${job.peerHeader.height}`,
					);
				}

				if (precommit.round !== job.ourHeader.round) {
					throw new Error(
						`Received precommit round ${precommit.round} does not match expected round ${job.peerHeader.round}`,
					);
				}

				const response = await this.precommitProcessor.process(precommit, false);

				if (response === Contracts.Consensus.ProcessorResult.Invalid) {
					throw new Error(`Received precommit is invalid`);
				}
			}

			// ALlow response to be empty
			if (prevotes.size > 0 || precommits.size > 0) {
				this.state.resetLastMessageTime();

				if (job.peerHeader.round > job.ourHeader.round) {
					if (
						!Utils.isMajority(
							prevotes.size + job.ourHeader.getValidatorsSignedPrevoteCount(),
							this.cryptoConfiguration,
						)
					) {
						throw new Error(`Peer didn't return enough prevotes for +2/3 majority`);
					}

					if (
						!Utils.isMajority(
							precommits.size + job.ourHeader.getValidatorsSignedPrecommitCount(),
							this.cryptoConfiguration,
						)
					) {
						throw new Error(`Peer didn't return enough precommits for +2/3 majority`);
					}
				} else {
					// Check if received all the requested data
					for (const index of job.prevoteIndexes) {
						if (!prevotes.has(index)) {
							throw new Error(`Missing prevote for validator ${index}`);
						}
					}

					for (const index of job.precommitIndexes) {
						if (!precommits.has(index)) {
							throw new Error(`Missing precommit for validator ${index}`);
						}
					}
				}
			}
		} catch (error_) {
			error = error_;
		}

		this.#removeDownloadJob(job);

		if (error) {
			this.peerDisposer.banPeer(job.peer.ip, error);
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
		if (!this.#downloadsByHeight.has(job.peerHeader.height)) {
			return;
		}

		const downloadsByHeight = this.#downloadsByHeight.get(job.peerHeader.height)!;

		for (const index of job.prevoteIndexes) {
			downloadsByHeight.prevotes[index] = false;
		}

		for (const index of job.precommitIndexes) {
			downloadsByHeight.precommits[index] = false;
		}
	}

	#getPrevoteIndexesToDownload(
		peer: Contracts.P2P.Peer,
		prevotes: boolean[],
		header: Contracts.P2P.IHeader,
	): number[] {
		const indexes: number[] = [];

		// Request all because their node have +2/3 prevotes for our round
		if (peer.header.round > header.round) {
			for (const [index, prevote] of prevotes.entries()) {
				if (!prevote) {
					indexes.push(index);
				}
			}

			return indexes;
		}

		// Request missing prevotes
		for (const [index, prevote] of prevotes.entries()) {
			if (
				peer.header.validatorsSignedPrevote[index] &&
				!prevote &&
				!header.roundState.getValidatorsSignedPrevote()[index]
			) {
				indexes.push(index);
			}
		}

		return indexes;
	}

	#getPrecommitIndexesToDownload(
		peer: Contracts.P2P.Peer,
		precommits: boolean[],
		header: Contracts.P2P.IHeader,
	): number[] {
		const indexes: number[] = [];

		// Request all because their node have +2/3 precommits for our round
		if (peer.header.round > header.round) {
			for (const [index, precommit] of precommits.entries()) {
				if (!precommit) {
					indexes.push(index);
				}
			}

			return indexes;
		}

		// Request missing precommits
		for (const [index, precommit] of precommits.entries()) {
			if (
				peer.header.validatorsSignedPrecommit[index] &&
				!precommit &&
				!header.roundState.getValidatorsSignedPrecommit()[index]
			) {
				indexes.push(index);
			}
		}

		return indexes;
	}
}
