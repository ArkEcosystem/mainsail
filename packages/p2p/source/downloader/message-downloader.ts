import { inject, injectable, postConstruct } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Enums, Utils } from "@mainsail/kernel";

import { getRandomPeer } from "../utils";

type DownloadsByRound = {
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

	#downloadsByHeight: Map<number, Map<number, DownloadsByRound>> = new Map();

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

		const downloads = this.#getDownloadsByRound(peer.header.height, peer.header.round);

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

		console.log(
			`Downloading messages from ${peer.ip} . ${header.height}/${header.round}`,
			prevoteIndexes,
			precommitIndexes,
		);

		this.#setDownloadJob(job, downloads);
		void this.#downloadMessagesFromPeer(job);
	}

	public isDownloading(): boolean {
		return this.#downloadsByHeight.size > 0;
	}

	#getDownloadsByRound(height: number, round: number): DownloadsByRound {
		if (!this.#downloadsByHeight.has(height)) {
			this.#downloadsByHeight.set(height, new Map<number, DownloadsByRound>());
		}

		const roundsByHeight = this.#downloadsByHeight.get(height)!;

		if (!roundsByHeight.has(round)) {
			roundsByHeight.set(round, {
				precommits: Array.from<boolean>({
					length: this.cryptoConfiguration.getMilestone().activeValidators,
				}).fill(false),
				prevotes: Array.from<boolean>({
					length: this.cryptoConfiguration.getMilestone().activeValidators,
				}).fill(false),
			});
		}

		return roundsByHeight.get(round)!;
	}

	#checkMessage({ height, round }: { height: number; round: number }, header: Contracts.P2P.IHeader): boolean {
		if (height !== header.height) {
			throw new Error(`Received message height ${height} does not match expected height ${header.height}`);
		}

		if (round !== header.round) {
			throw new Error(`Received message round ${round} does not match expected round ${header.round}`);
		}
	}

	async #downloadMessagesFromPeer(job: DownloadJob): Promise<void> {
		let error: Error | undefined;

		try {
			const result = await this.communicator.getMessages(job.peer);

			const prevotes: Map<number, Contracts.Crypto.IPrevote> = new Map();
			for (const buffer of result.prevotes) {
				const prevote = await this.factory.makePrevoteFromBytes(buffer);
				prevotes.set(prevote.validatorIndex, prevote);

				this.#checkMessage(prevote, job.ourHeader);

				const response = await this.prevoteProcessor.process(prevote, false);

				if (response === Contracts.Consensus.ProcessorResult.Invalid) {
					throw new Error(`Received prevote is invalid`);
				}
			}

			const precommits: Map<number, Contracts.Crypto.IPrecommit> = new Map();
			for (const buffer of result.precommits) {
				const precommit = await this.factory.makePrecommitFromBytes(buffer);
				precommits.set(precommit.validatorIndex, precommit);

				this.#checkMessage(precommit, job.ourHeader);

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

	#setDownloadJob(job: DownloadJob, downloadsByRound: DownloadsByRound): void {
		for (const index of job.prevoteIndexes) {
			downloadsByRound.prevotes[index] = true;
		}

		for (const index of job.precommitIndexes) {
			downloadsByRound.precommits[index] = true;
		}
	}

	#removeDownloadJob(job: DownloadJob): void {
		// Return if the height was already removed, because the block was applied.
		const roundsByHeight = this.#downloadsByHeight.get(job.ourHeader.height);
		if (!roundsByHeight) {
			return;
		}

		const downloadsByRound = roundsByHeight.get(job.ourHeader.round);
		if (!downloadsByRound) {
			return;
		}

		for (const index of job.prevoteIndexes) {
			downloadsByRound.prevotes[index] = false;
		}

		for (const index of job.precommitIndexes) {
			downloadsByRound.precommits[index] = false;
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
			if (peer.header.validatorsSignedPrevote[index] && !prevote && !header.validatorsSignedPrevote[index]) {
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
				!header.validatorsSignedPrecommit[index]
			) {
				indexes.push(index);
			}
		}

		return indexes;
	}
}
