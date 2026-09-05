import type { Contracts } from "@mainsail/contracts";

import { isMinority } from "@mainsail/blockchain-utils";
import { Enums, Events, Identifiers } from "@mainsail/constants";
import { inject, injectable, postConstruct } from "@mainsail/container";
import { ensureError } from "@mainsail/utils";

import { getRandomPeer } from "../utils/index.js";

type DownloadsByRound = {
	precommits: boolean[];
	prevotes: boolean[];
};

class IncompleteResponseError extends Error {}

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

	@inject(Identifiers.Consensus.Processor.Message)
	private readonly messageProcessor!: Contracts.Consensus.MessageProcessor;

	@inject(Identifiers.Cryptography.Message.Factory)
	private readonly factory!: Contracts.Crypto.MessageFactory;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly cryptoConfiguration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.P2P.State)
	private readonly state!: Contracts.P2P.State;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	#fullDownloadsByBlockNumber: Map<number, Set<number>> = new Map();
	#downloadsByBlockNumber: Map<number, Map<number, DownloadsByRound>> = new Map();

	@postConstruct()
	public initialize(): void {
		this.events.listen(Events.BlockEvent.Applied, {
			handle: async ({ data }): Promise<void> => {
				const { number } = data as Contracts.Crypto.BlockData;

				this.#downloadsByBlockNumber.delete(number);
				this.#fullDownloadsByBlockNumber.delete(number);
			},
		});
	}

	public tryToDownload(): void {
		if (this.blockDownloader.isDownloading()) {
			return;
		}

		const header = this.headerFactory();
		let peers = this.repository.getPeers();

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
			const downloads = this.#getDownloadsByRound(peer.header.blockNumber, round);

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
			const downloads = this.#peekDownloadsByRound(peerHeader.blockNumber, round);

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

		if (
			isMinority(peerHeader.validatorsSignedPrevote.filter(Boolean).length, roundValidators) ||
			isMinority(peerHeader.validatorsSignedPrecommit.filter(Boolean).length, roundValidators)
		) {
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
			roundsByBlockNumber.set(round, this.#makeDownloadsByRound(blockNumber));
		}

		return roundsByBlockNumber.get(round)!;
	}

	#peekDownloadsByRound(blockNumber: number, round: number): DownloadsByRound {
		return this.#downloadsByBlockNumber.get(blockNumber)?.get(round) ?? this.#makeDownloadsByRound(blockNumber);
	}

	#makeDownloadsByRound(blockNumber: number): DownloadsByRound {
		const { roundValidators } = this.cryptoConfiguration.getMilestone(blockNumber);

		return {
			precommits: Array.from<boolean>({ length: roundValidators }).fill(false),
			prevotes: Array.from<boolean>({ length: roundValidators }).fill(false),
		};
	}

	#checkMessage(message: Contracts.Crypto.Message, job: DownloadJob): void {
		if (message.blockNumber !== job.blockNumber || message.round !== job.round) {
			throw new Error(
				`Received message blockNumber ${message.blockNumber} and round ${message.round} does not match requested blockNumber ${job.blockNumber} and round ${job.round}`,
			);
		}
	}

	#checkResponse(
		prevotesMap: Map<number, Contracts.Crypto.Message>,
		precommitsMap: Map<number, Contracts.Crypto.Message>,
		job: DownloadJob,
	) {
		const prevotes = [...prevotesMap.values()];
		const precommits = [...precommitsMap.values()];

		if (prevotes.length === 0 && precommits.length === 0) {
			return;
		}

		this.state.resetLastMessageTime();

		if (job.peerHeader.round !== job.round) {
			return;
		}

		if (job.isFullDownload) {
			this.#checkFullRoundResponse(prevotesMap, precommitsMap, job);
		} else {
			this.#checkPartialRoundResponse(prevotesMap, precommitsMap, job);
		}
	}

	#checkFullRoundResponse(
		prevotes: Map<number, Contracts.Crypto.Message>,
		precommits: Map<number, Contracts.Crypto.Message>,
		job: DownloadJob,
	) {
		const { roundValidators } = this.cryptoConfiguration.getMilestone(job.blockNumber);

		if (!isMinority(prevotes.size, roundValidators) && !isMinority(precommits.size, roundValidators)) {
			throw new IncompleteResponseError(`Peer didn't return a blocking minority of prevotes or precommits`);
		}
	}

	#checkPartialRoundResponse(
		prevotes: Map<number, Contracts.Crypto.Message>,
		precommits: Map<number, Contracts.Crypto.Message>,
		job: DownloadJob,
	) {
		for (const index of job.prevoteIndexes) {
			if (!prevotes.has(index)) {
				throw new IncompleteResponseError(`Missing prevote for validator ${index}`);
			}
		}

		for (const index of job.precommitIndexes) {
			if (!precommits.has(index)) {
				throw new IncompleteResponseError(`Missing precommit for validator ${index}`);
			}
		}
	}

	async #downloadMessagesFromPeer(job: DownloadJob): Promise<void> {
		let error: Error | undefined;

		try {
			const { roundValidators } = this.cryptoConfiguration.getMilestone(job.blockNumber);
			const nothingSigned = Array.from<boolean>({ length: roundValidators }).fill(false);

			const result = await this.communicator.getMessages(job.peer, {
				blockNumber: job.blockNumber,
				round: job.round,
				validatorsSignedPrecommit: job.isFullDownload
					? nothingSigned
					: [...job.ourHeader.validatorsSignedPrecommit],
				validatorsSignedPrevote: job.isFullDownload
					? nothingSigned
					: [...job.ourHeader.validatorsSignedPrevote],
			});

			const prevotes: Map<number, Contracts.Crypto.Message> = new Map();
			for (const buffer of result.prevotes) {
				const prevote = await this.factory.makeMessageFromBytes(buffer);
				prevotes.set(prevote.validatorIndex, prevote);

				this.#checkMessage(prevote, job);

				const response = await this.messageProcessor.process(prevote, false);

				if (response === Enums.Consensus.ProcessorResult.Invalid) {
					throw new Error(`Received prevote is invalid`);
				}
			}

			const precommits: Map<number, Contracts.Crypto.Message> = new Map();
			for (const buffer of result.precommits) {
				const precommit = await this.factory.makeMessageFromBytes(buffer);
				precommits.set(precommit.validatorIndex, precommit);

				this.#checkMessage(precommit, job);

				const response = await this.messageProcessor.process(precommit, false);

				if (response === Enums.Consensus.ProcessorResult.Invalid) {
					throw new Error(`Received precommit is invalid`);
				}
			}

			this.#checkResponse(prevotes, precommits, job);
		} catch (rawError) {
			error = ensureError(rawError);
		}

		this.#removeDownloadJob(job);

		if (error) {
			if (error instanceof IncompleteResponseError) {
				this.logger.debug(`Incomplete response from ${job.peer.ip}: ${error.message}`, "p2p");
			} else {
				this.peerDisposer.banPeer(job.peer.ip, error);
			}

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

		if (this.#fullDownloadsByBlockNumber.get(job.blockNumber)?.size === 0) {
			this.#fullDownloadsByBlockNumber.delete(job.blockNumber);
		}
	}

	#removePartialDownloadJob(job: DownloadJob) {
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

		for (const [index, precommit] of messages.entries()) {
			if (!precommit && peerValidatorsSignedMessage[index] && !ourValidatorsSignedMessage[index]) {
				indexes.push(index);
			}
		}

		return indexes;
	}
}
