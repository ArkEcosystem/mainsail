import { isMajority, isMinority } from "@mainsail/blockchain-utils";
import { inject, injectable, postConstruct } from "@mainsail/container";
import { Contracts, Events, Identifiers } from "@mainsail/contracts";

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
	blockNumber: number;
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

	@inject(Identifiers.State.Store)
	private readonly stateStore!: Contracts.State.Store;

	@inject(Identifiers.P2P.State)
	private readonly state!: Contracts.P2P.State;

	#fullDownloadsByBlockNumber: Map<number, Set<number>> = new Map();
	#downloadsByBlockNumber: Map<number, Map<number, DownloadsByRound>> = new Map();

	@postConstruct()
	public initialize(): void {
		this.events.listen(Events.BlockEvent.Applied, {
			handle: () => {
				this.#downloadsByBlockNumber.delete(this.stateStore.getBlockNumber());
				this.#fullDownloadsByBlockNumber.delete(this.stateStore.getBlockNumber());
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
			const downloads = this.#getDownloadsByRound(peer.header.blockNumber, peer.header.round);

			const job: DownloadJob = {
				blockNumber: ourHeader.blockNumber,
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
			this.#setFullDownload(peer.header.blockNumber, round);

			const job: DownloadJob = {
				blockNumber: ourHeader.blockNumber,
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
		return this.#downloadsByBlockNumber.size > 0 || this.#fullDownloadsByBlockNumber.size > 0;
	}

	#canDownload(ourHeader: Contracts.P2P.Header, peerHeader: Contracts.P2P.HeaderData): boolean {
		if (ourHeader.blockNumber !== peerHeader.blockNumber || ourHeader.round > peerHeader.round) {
			return false;
		}

		const round = this.#getHighestRoundToDownload(ourHeader, peerHeader);
		if (ourHeader.round === round) {
			const downloads = this.#getDownloadsByRound(peerHeader.blockNumber, peerHeader.round);

			const prevoteIndexes = this.#getPrevoteIndexesToDownload(ourHeader, peerHeader, downloads.prevotes);
			const precommitIndexes = this.#getPrecommitIndexesToDownload(ourHeader, peerHeader, downloads.precommits);

			if (prevoteIndexes.length === 0 && precommitIndexes.length === 0) {
				return false;
			}

			return true;
		}

		return this.#canDownloadFullRound(peerHeader.blockNumber, round);
	}

	#getHighestRoundToDownload(ourHeader: Contracts.P2P.Header, peerHeader: Contracts.P2P.HeaderData): number {
		if (peerHeader.round <= ourHeader.round) {
			return peerHeader.round;
		}

		const { roundValidators } = this.cryptoConfiguration.getMilestone(ourHeader.blockNumber);

		if (isMinority(peerHeader.validatorsSignedPrevote.filter(Boolean).length, roundValidators)) {
			return peerHeader.round;
		}

		return peerHeader.round - 1;
	}

	#canDownloadFullRound(blockNumber: number, round: number): boolean {
		if (!this.#fullDownloadsByBlockNumber.has(blockNumber)) {
			return true;
		}

		const rounds = [...this.#fullDownloadsByBlockNumber.get(blockNumber)!.values()];
		if (rounds.length === 0) {
			return true;
		}

		const highestDownloadingRound = Math.max(...rounds);
		return round > highestDownloadingRound;
	}

	#setFullDownload(blockNumber: number, round: number): void {
		if (!this.#fullDownloadsByBlockNumber.has(blockNumber)) {
			this.#fullDownloadsByBlockNumber.set(blockNumber, new Set<number>());
		}

		this.#fullDownloadsByBlockNumber.get(blockNumber)!.add(round);
	}

	#getDownloadsByRound(blockNumber: number, round: number): DownloadsByRound {
		if (!this.#downloadsByBlockNumber.has(blockNumber)) {
			this.#downloadsByBlockNumber.set(blockNumber, new Map<number, DownloadsByRound>());
		}

		const roundsByBlockNumber = this.#downloadsByBlockNumber.get(blockNumber)!;

		if (!roundsByBlockNumber.has(round)) {
			roundsByBlockNumber.set(round, {
				precommits: Array.from<boolean>({
					length: this.cryptoConfiguration.getMilestone(blockNumber).roundValidators,
				}).fill(false),
				prevotes: Array.from<boolean>({
					length: this.cryptoConfiguration.getMilestone(blockNumber).roundValidators,
				}).fill(false),
			});
		}

		return roundsByBlockNumber.get(round)!;
	}

	#checkMessage(
		message: Contracts.Crypto.Precommit | Contracts.Crypto.Prevote,
		firstMessage: Contracts.Crypto.Precommit | Contracts.Crypto.Prevote,
		job: DownloadJob,
	): void {
		if (message.blockNumber !== firstMessage.blockNumber || message.round !== firstMessage.round) {
			throw new Error(
				`Received message blockNumber ${message.blockNumber} and round ${message.round} does not match expected blockNumber ${firstMessage.blockNumber} and round ${firstMessage.round}`,
			);
		}

		if (message.blockNumber !== job.blockNumber) {
			throw new Error(
				`Received message blockNumber ${message.blockNumber} does not match expected blockNumber ${job.blockNumber}`,
			);
		}

		if (message.round < job.round) {
			throw new Error(`Received message round ${message.round} is lower than requested round ${job.round}`);
		}
	}

	#checkResponse(
		prevotesMap: Map<number, Contracts.Crypto.Prevote>,
		precommitsMap: Map<number, Contracts.Crypto.Precommit>,
		job: DownloadJob,
	) {
		const prevotes = [...prevotesMap.values()];
		const precommits = [...precommitsMap.values()];

		// Allow response to be empty
		if (prevotes.length === 0 && precommits.length === 0) {
			return;
		}

		this.state.resetLastMessageTime();

		// Check actual received round, because we might have received a full response even if we marked request as a partial
		const receivedRound = prevotes.length > 0 ? prevotes[0].round : precommits[0].round;

		if (job.ourHeader.round < receivedRound) {
			this.#checkFullRoundResponse(prevotesMap, precommitsMap, job);
		} else {
			this.#checkPartialRoundResponse(prevotesMap, precommitsMap, job);
		}
	}

	#checkFullRoundResponse(
		prevotes: Map<number, Contracts.Crypto.Prevote>,
		precommits: Map<number, Contracts.Crypto.Precommit>,
		job: DownloadJob,
	) {
		const { roundValidators } = this.cryptoConfiguration.getMilestone(job.blockNumber);

		if (!isMajority(prevotes.size + job.ourHeader.getValidatorsSignedPrevoteCount(), roundValidators)) {
			throw new Error(`Peer didn't return enough prevotes for +2/3 majority`);
		}

		if (!isMajority(precommits.size + job.ourHeader.getValidatorsSignedPrecommitCount(), roundValidators)) {
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
		this.#fullDownloadsByBlockNumber.get(job.blockNumber)?.delete(job.round);

		// Cleanup
		if (this.#fullDownloadsByBlockNumber.get(job.blockNumber)?.size === 0) {
			this.#fullDownloadsByBlockNumber.delete(job.blockNumber);
		}
	}

	#removePartialDownloadJob(job: DownloadJob) {
		// Return if the blockNumber was already removed, because the block was applied.
		const roundsByBlockNumber = this.#downloadsByBlockNumber.get(job.blockNumber);
		if (!roundsByBlockNumber) {
			return;
		}

		const downloadsByRound = roundsByBlockNumber.get(job.round);
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
			roundsByBlockNumber.delete(job.round);
		}

		if (this.#downloadsByBlockNumber.get(job.blockNumber)?.size === 0) {
			this.#downloadsByBlockNumber.delete(job.blockNumber);
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
