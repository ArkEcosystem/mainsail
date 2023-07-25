import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { randomNumber } from "@mainsail/utils";

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
export class MessageDownloader {
	@inject(Identifiers.PeerCommunicator)
	private readonly communicator!: Contracts.P2P.PeerCommunicator;

	@inject(Identifiers.PeerRepository)
	private readonly repository!: Contracts.P2P.PeerRepository;

	@inject(Identifiers.PeerHeaderFactory)
	private readonly headerFactory!: Contracts.P2P.HeaderFactory;

	@inject(Identifiers.Consensus.Handler)
	private readonly handler!: Contracts.Consensus.IHandler;

	@inject(Identifiers.Cryptography.Message.Factory)
	private readonly messageFactory!: Contracts.Crypto.IMessageFactory;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly cryptoConfiguration!: Contracts.Crypto.IConfiguration;

	#downloadsByHeight = new Map<number, DownloadsByHeight>();

	public tryToDownloadMessages(): void {
		const header = this.headerFactory();

		let peers = this.repository.getPeers().filter((peer) => header.canDownloadMessages(peer.state));

		while (peers.length > 0) {
			void this.downloadMessages(this.#getRandomPeer(peers));
			peers = peers.filter((peer) => header.canDownloadMessages(peer.state));
		}
	}

	// TODO: Handle errors
	public async downloadMessages(peer: Contracts.P2P.Peer): Promise<void> {
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
		let isError = false;

		try {
			const result = await this.communicator.getMessages(job.peer);

			for (const prevoteBuffer of result.prevotes) {
				const prevote = await this.messageFactory.makePrevoteFromBytes(prevoteBuffer);

				await this.handler.onPrevote(prevote);
			}

			for (const precommitBuffer of result.precommits) {
				const precommit = await this.messageFactory.makePrecommitFromBytes(precommitBuffer);

				await this.handler.onPrecommit(precommit);
			}
		} catch {
			isError = true;
		}

		this.#removeDownloadJob(job, this.#getDownloadsByHeight(job.height));

		if (isError) {
			this.#handleError(job);
		}
	}

	#handleError(job: DownloadJob): void {
		// TODO: Remove peer from repository

		this.tryToDownloadMessages();
	}

	#setDownloadJob(job: DownloadJob, downloadsByHeight: DownloadsByHeight): void {
		for (const index of job.prevoteIndexes) {
			downloadsByHeight.prevotes[index] = true;
		}

		for (const index of job.precommitIndexes) {
			downloadsByHeight.precommits[index] = true;
		}
	}

	#removeDownloadJob(job: DownloadJob, downloadsByHeight: DownloadsByHeight): void {
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

	#getRandomPeer(peers: Contracts.P2P.Peer[]): Contracts.P2P.Peer {
		return peers[randomNumber(0, peers.length - 1)];
	}
}
