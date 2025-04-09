import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { getRandomPeer } from "../utils/index.js";

type DownloadJob = {
	peer: Contracts.P2P.Peer;
	peerHeader: Contracts.P2P.HeaderData;
	blockNumber: number;
	round: number;
};
@injectable()
export class ProposalDownloader implements Contracts.P2P.Downloader {
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

	@inject(Identifiers.Cryptography.Message.Factory)
	private readonly factory!: Contracts.Crypto.MessageFactory;

	@inject(Identifiers.Consensus.Processor.Proposal)
	private readonly proposalProcessor!: Contracts.Consensus.ProposalProcessor;

	@inject(Identifiers.P2P.State)
	private readonly state!: Contracts.P2P.State;

	#downloadsByBlockNumber: Map<number, Set<number>> = new Map();

	public tryToDownload(): void {
		if (this.blockDownloader.isDownloading()) {
			return;
		}

		const header = this.headerFactory();
		const peers = this.repository.getPeers().filter((peer) => this.#canDownload(header, peer.header));

		if (peers.length > 0) {
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

		const job: DownloadJob = {
			blockNumber: peer.header.blockNumber,
			peer,
			peerHeader: peer.header,
			round: peer.header.round,
		};

		this.#setDownload(job);
		void this.#downloadProposalFromPeer(job);
	}

	public isDownloading(): boolean {
		return this.#downloadsByBlockNumber.size > 0;
	}

	#canDownload(ourHeader: Contracts.P2P.Header, peerHeader: Contracts.P2P.HeaderData) {
		if (ourHeader.blockNumber !== peerHeader.blockNumber || ourHeader.round !== peerHeader.round) {
			return false;
		}

		if (
			this.#downloadsByBlockNumber.has(peerHeader.blockNumber) &&
			this.#downloadsByBlockNumber.get(peerHeader.blockNumber)!.has(peerHeader.round)
		) {
			return false;
		}

		return ourHeader.proposal === undefined && !!peerHeader.proposedBlockHash;
	}

	#setDownload(job: DownloadJob) {
		if (!this.#downloadsByBlockNumber.has(job.blockNumber)) {
			this.#downloadsByBlockNumber.set(job.blockNumber, new Set());
		}

		this.#downloadsByBlockNumber.get(job.blockNumber)!.add(job.round);
	}

	#removeDownload(job: DownloadJob) {
		if (!this.#downloadsByBlockNumber.has(job.blockNumber)) {
			return;
		}

		this.#downloadsByBlockNumber.get(job.blockNumber)!.delete(job.round);

		if (this.#downloadsByBlockNumber.get(job.blockNumber)!.size === 0) {
			this.#downloadsByBlockNumber.delete(job.blockNumber);
		}
	}

	async #downloadProposalFromPeer(job: DownloadJob): Promise<void> {
		let error: Error | undefined;

		try {
			const result = await this.communicator.getProposal(job.peer);

			if (result.proposal.length === 0) {
				return;
			}

			const proposal = await this.factory.makeProposalFromBytes(result.proposal);
			if (proposal.blockNumber !== job.blockNumber) {
				throw new Error(
					`Received proposal blockNumber ${proposal.blockNumber} does not match expected blockNumber ${job.blockNumber}`,
				);
			}

			if (proposal.round !== job.round) {
				throw new Error(`Received proposal round ${proposal.round} does not match expected round ${job.round}`);
			}

			const response = await this.proposalProcessor.process(proposal, false);
			if (response === Contracts.Consensus.ProcessorResult.Invalid) {
				throw new Error(`Received proposal is invalid`);
			}

			this.state.resetLastMessageTime();
		} catch (error_) {
			error = error_;
		}

		this.#removeDownload(job);

		if (error) {
			this.peerDisposer.banPeer(job.peer.ip, error);
			this.tryToDownload();
		}
	}
}
