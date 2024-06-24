import { inject, injectable, postConstruct } from "@mainsail/container";
import { Contracts, Events, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

import { getRandomPeer } from "../utils/index.js";

type DownloadsByRound = {
	precommits: boolean[];
	prevotes: boolean[];
};

type DownloadJob = {
	isFullDownload: boolean;
	peer: Contracts.P2P.Peer;
	peerHeader: Contracts.P2P.HeaderData;
	ourHeader: Contracts.P2P.Header;
	prevoteIndexes: number[];
	precommitIndexes: number[];
	round: number;
	height: number;
};

/* Terminology:
 * Full download -> download at least 1/3 prevotes for the higher round, that will allow consensus to move forward
 * Partial download -> download only the missing prevotes and precommits for the current round
 */

@injectable()
export class MessageDownloader implements Contracts.P2P.Downloader {
	@inject(Identifiers.P2P.Peer.Communicator)
	private readonly communicator!: Contracts.P2P.PeerCommunicator;

	@inject(Identifiers.P2P.Peer.Repository)
	private readonly repository!: Contracts.P2P.PeerRepository;

	@inject(Identifiers.P2P.Header.Factory)
	private readonly headerFactory!: Contracts.P2P.HeaderFactory;

	@inject(Identifiers.P2P.Downloader.Block)
	private readonly blockDownloader!: Contracts.P2P.Downloader;

	@inject(Identifiers.P2P.Peer.Disposer)
	private readonly peerDisposer!: Contracts.P2P.PeerDisposer;

	@inject(Identifiers.Consensus.Processor.PreVote)
	private readonly prevoteProcessor!: Contracts.Consensus.PrevoteProcessor;

	@inject(Identifiers.Consensus.Processor.PreCommit)
	private readonly precommitProcessor!: Contracts.Consensus.PrecommitProcessor;

	@inject(Identifiers.Cryptography.Message.Factory)
	private readonly factory!: Contracts.Crypto.MessageFactory;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly cryptoConfiguration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.State.Service)
	private readonly stateService!: Contracts.State.Service;

	@inject(Identifiers.P2P.State)
	private readonly state!: Contracts.P2P.State;

	#fullDownloadsByHeight: Map<number, Set<number>> = new Map();
	#downloadsByHeight: Map<number, Map<number, DownloadsByRound>> = new Map();

	@postConstruct()
	public initialize(): void {
		this.events.listen(Events.BlockEvent.Applied, {
			handle: () => {
				const store = this.stateService.getStore();
				this.#downloadsByHeight.delete(store.getLastHeight());
				this.#fullDownloadsByHeight.delete(store.getLastHeight());
			},
		});
	}

	public tryToDownload(): void {
		if (this.blockDownloader.isDownloading()) {
			return;
		}

		const header = this.headerFactory();
		let peers = this.repository.getPeers();

		// Create download jobs as long as we can download
		while ((peers = peers.filter((peer) => this.#canDownload(header, peer.header))) && peers.length > 0) {
			this.download(getRandomPeer(peers));
		}
	}

	public download(peer: Contracts.P2P.Peer): void {
		if (this.blockDownloader.isDownloading()) {
			return;
		}

		const ourHeader = this.headerFactory();
		if (!this.#canDownload(ourHeader, peer.header)) {
			return;
		}

		const round = this.#getHighestRoundToDownload(ourHeader, peer.header);
		if (ourHeader.round === round) {
			const downloads = this.#getDownloadsByRound(peer.header.height, peer.header.round);

			const job: DownloadJob = {
				height: ourHeader.height,
				isFullDownload: false,
				ourHeader: ourHeader,
				peer,
				peerHeader: peer.header,
				precommitIndexes: this.#getPrecommitIndexesToDownload(ourHeader, peer.header, downloads.precommits),
				prevoteIndexes: this.#getPrevoteIndexesToDownload(ourHeader, peer.header, downloads.prevotes),
				round,
			};

			this.#setDownloadJob(job, downloads);
			void this.#downloadMessagesFromPeer(job);
		} else if (peer.header.round > ourHeader.round) {
			this.#setFullDownload(peer.header.height, round);

			const job: DownloadJob = {
				height: ourHeader.height,
				isFullDownload: true,
				ourHeader: ourHeader,
				peer,
				peerHeader: peer.header,
				precommitIndexes: [],
				prevoteIndexes: [],
				round,
			};

			void this.#downloadMessagesFromPeer(job);
		}
	}

	public isDownloading(): boolean {
		return this.#downloadsByHeight.size > 0 || this.#fullDownloadsByHeight.size > 0;
	}

	#canDownload(ourHeader: Contracts.P2P.Header, peerHeader: Contracts.P2P.HeaderData): boolean {
		if (ourHeader.height !== peerHeader.height || ourHeader.round > peerHeader.round) {
			return false;
		}

		const round = this.#getHighestRoundToDownload(ourHeader, peerHeader);
		if (ourHeader.round === round) {
			const downloads = this.#getDownloadsByRound(peerHeader.height, peerHeader.round);

			const prevoteIndexes = this.#getPrevoteIndexesToDownload(ourHeader, peerHeader, downloads.prevotes);
			const precommitIndexes = this.#getPrecommitIndexesToDownload(ourHeader, peerHeader, downloads.precommits);

			if (prevoteIndexes.length === 0 && precommitIndexes.length === 0) {
				return false;
			}

			return true;
		}

		return this.#canDownloadFullRound(peerHeader.height, round);
	}

	#getHighestRoundToDownload(ourHeader: Contracts.P2P.Header, peerHeader: Contracts.P2P.HeaderData): number {
		if (peerHeader.round <= ourHeader.round) {
			return peerHeader.round;
		}

		const { activeValidators } = this.cryptoConfiguration.getMilestone(ourHeader.height);

		if (Utils.isMinority(peerHeader.validatorsSignedPrevote.filter(Boolean).length, activeValidators)) {
			return peerHeader.round;
		}

		return peerHeader.round - 1;
	}

	#canDownloadFullRound(height: number, round: number): boolean {
		if (!this.#fullDownloadsByHeight.has(height)) {
			return true;
		}

		const rounds = [...this.#fullDownloadsByHeight.get(height)!.values()];
		if (rounds.length === 0) {
			return true;
		}

		const highestDownloadingRound = Math.max(...rounds);
		return round > highestDownloadingRound;
	}

	#setFullDownload(height: number, round: number): void {
		if (!this.#fullDownloadsByHeight.has(height)) {
			this.#fullDownloadsByHeight.set(height, new Set<number>());
		}

		this.#fullDownloadsByHeight.get(height)!.add(round);
	}

	#getDownloadsByRound(height: number, round: number): DownloadsByRound {
		if (!this.#downloadsByHeight.has(height)) {
			this.#downloadsByHeight.set(height, new Map<number, DownloadsByRound>());
		}

		const roundsByHeight = this.#downloadsByHeight.get(height)!;

		if (!roundsByHeight.has(round)) {
			roundsByHeight.set(round, {
				precommits: Array.from<boolean>({
					length: this.cryptoConfiguration.getMilestone(height).activeValidators,
				}).fill(false),
				prevotes: Array.from<boolean>({
					length: this.cryptoConfiguration.getMilestone(height).activeValidators,
				}).fill(false),
			});
		}

		return roundsByHeight.get(round)!;
	}

	#checkMessage(
		message: Contracts.Crypto.Precommit | Contracts.Crypto.Prevote,
		firstMessage: Contracts.Crypto.Precommit | Contracts.Crypto.Prevote,
		job: DownloadJob,
	): void {
		if (message.height !== firstMessage.height || message.round !== firstMessage.round) {
			throw new Error(
				`Received message height ${message.height} and round ${message.round} does not match expected height ${firstMessage.height} and round ${firstMessage.round}`,
			);
		}

		if (message.height !== job.height) {
			throw new Error(`Received message height ${message.height} does not match expected height ${job.height}`);
		}

		if (message.round < job.round) {
			throw new Error(`Received message round ${message.round} is lower than requested round ${job.round}`);
		}
	}

	#checkResponse(
		prevotes: Map<number, Contracts.Crypto.Prevote>,
		precommits: Map<number, Contracts.Crypto.Precommit>,
		job: DownloadJob,
	) {
		// ALlow response to be empty
		if (prevotes.size === 0 && precommits.size === 0) {
			return;
		}

		this.state.resetLastMessageTime();

		// Check actual received round, because we might have received a full response even if we marked request as a partial
		const receivedRound =
			prevotes.size > 0 ? prevotes.values().next().value.round : precommits.values().next().value.round;

		if (job.ourHeader.round < receivedRound) {
			this.#checkFullRoundResponse(prevotes, precommits, job);
		} else {
			this.#checkPartialRoundResponse(prevotes, precommits, job);
		}
	}

	#checkFullRoundResponse(
		prevotes: Map<number, Contracts.Crypto.Prevote>,
		precommits: Map<number, Contracts.Crypto.Precommit>,
		job: DownloadJob,
	) {
		const { activeValidators } = this.cryptoConfiguration.getMilestone(job.height);

		if (!Utils.isMajority(prevotes.size + job.ourHeader.getValidatorsSignedPrevoteCount(), activeValidators)) {
			throw new Error(`Peer didn't return enough prevotes for +2/3 majority`);
		}

		if (!Utils.isMajority(precommits.size + job.ourHeader.getValidatorsSignedPrecommitCount(), activeValidators)) {
			throw new Error(`Peer didn't return enough precommits for +2/3 majority`);
		}
	}

	#checkPartialRoundResponse(
		prevotes: Map<number, Contracts.Crypto.Prevote>,
		precommits: Map<number, Contracts.Crypto.Precommit>,
		job: DownloadJob,
	) {
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

	async #downloadMessagesFromPeer(job: DownloadJob): Promise<void> {
		let error: Error | undefined;

		try {
			const result = await this.communicator.getMessages(job.peer);

			let firstPrevote: Contracts.Crypto.Prevote | undefined;
			const prevotes: Map<number, Contracts.Crypto.Prevote> = new Map();
			for (const buffer of result.prevotes) {
				const prevote = await this.factory.makePrevoteFromBytes(buffer);
				prevotes.set(prevote.validatorIndex, prevote);

				if (firstPrevote === undefined) {
					firstPrevote = prevote;
				}
				this.#checkMessage(prevote, firstPrevote, job);

				const response = await this.prevoteProcessor.process(prevote, false);

				if (response === Contracts.Consensus.ProcessorResult.Invalid) {
					throw new Error(`Received prevote is invalid`);
				}
			}

			let firstPrecommit: Contracts.Crypto.Prevote | undefined;
			const precommits: Map<number, Contracts.Crypto.Precommit> = new Map();
			for (const buffer of result.precommits) {
				const precommit = await this.factory.makePrecommitFromBytes(buffer);
				precommits.set(precommit.validatorIndex, precommit);

				if (firstPrecommit === undefined) {
					firstPrecommit = precommit;
				}
				this.#checkMessage(precommit, firstPrecommit, job);

				const response = await this.precommitProcessor.process(precommit, false);

				if (response === Contracts.Consensus.ProcessorResult.Invalid) {
					throw new Error(`Received precommit is invalid`);
				}
			}

			this.#checkResponse(prevotes, precommits, job);
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
		if (job.isFullDownload) {
			this.#removeFullDownloadJob(job);
		} else {
			this.#removePartialDownloadJob(job);
		}
	}

	#removeFullDownloadJob(job: DownloadJob) {
		this.#fullDownloadsByHeight.get(job.height)?.delete(job.round);

		// Cleanup
		if (this.#fullDownloadsByHeight.get(job.height)?.size === 0) {
			this.#fullDownloadsByHeight.delete(job.height);
		}
	}

	#removePartialDownloadJob(job: DownloadJob) {
		// Return if the height was already removed, because the block was applied.
		const roundsByHeight = this.#downloadsByHeight.get(job.height);
		if (!roundsByHeight) {
			return;
		}

		const downloadsByRound = roundsByHeight.get(job.round);
		if (!downloadsByRound) {
			return;
		}

		for (const index of job.prevoteIndexes) {
			downloadsByRound.prevotes[index] = false;
		}

		for (const index of job.precommitIndexes) {
			downloadsByRound.precommits[index] = false;
		}

		// Cleanup
		if (
			downloadsByRound.prevotes.every((value) => !value) &&
			downloadsByRound.precommits.every((value) => !value)
		) {
			roundsByHeight.delete(job.round);
		}

		if (this.#downloadsByHeight.get(job.height)?.size === 0) {
			this.#downloadsByHeight.delete(job.height);
		}
	}

	#getPrevoteIndexesToDownload(
		ourHeader: Contracts.P2P.Header,
		peerHeader: Contracts.P2P.HeaderData,
		prevotes: boolean[],
	): number[] {
		return this.#getIndexesToDownload(
			ourHeader.validatorsSignedPrevote,
			peerHeader.validatorsSignedPrevote,
			prevotes,
		);
	}

	#getPrecommitIndexesToDownload(
		ourHeader: Contracts.P2P.Header,
		peerHeader: Contracts.P2P.HeaderData,
		precommits: boolean[],
	): number[] {
		return this.#getIndexesToDownload(
			ourHeader.validatorsSignedPrecommit,
			peerHeader.validatorsSignedPrecommit,
			precommits,
		);
	}

	#getIndexesToDownload(
		ourValidatorsSignedMessage: readonly boolean[],
		peerValidatorsSignedMessage: readonly boolean[],
		messages: boolean[],
	): number[] {
		const indexes: number[] = [];

		// Request missing messages
		for (const [index, precommit] of messages.entries()) {
			if (!precommit && peerValidatorsSignedMessage[index] && !ourValidatorsSignedMessage[index]) {
				indexes.push(index);
			}
		}

		return indexes;
	}
}
