import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { getRandomPeer } from "../utils";

type DownloadJob = {
	peer: Contracts.P2P.Peer;
	peerHeader: Contracts.P2P.HeaderData;
	height: number;
	round: number;
};
@injectable()
export class ProposalDownloader implements Contracts.P2P.Downloader {
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

	@inject(Identifiers.Cryptography.Message.Factory)
	private readonly factory!: Contracts.Crypto.MessageFactory;

	@inject(Identifiers.Consensus.ProposalProcessor)
	private readonly proposalProcessor!: Contracts.Consensus.ProposalProcessor;

	@inject(Identifiers.P2PState)
	private readonly state!: Contracts.P2P.State;

	#downloadsByHeight: Map<number, Set<number>> = new Map();

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
			height: peer.header.height,
			peer,
			peerHeader: peer.header,
			round: peer.header.round,
		};

		this.#setDownload(job);
		void this.#downloadProposalFromPeer(job);
	}

	public isDownloading(): boolean {
		return this.#downloadsByHeight.size > 0;
	}

	#canDownload(ourHeader: Contracts.P2P.Header, peerHeader: Contracts.P2P.HeaderData) {
		if (ourHeader.height !== peerHeader.height || ourHeader.round !== peerHeader.round) {
			return false;
		}

		if (
			this.#downloadsByHeight.has(peerHeader.height) &&
			this.#downloadsByHeight.get(peerHeader.height)!.has(peerHeader.round)
		) {
			return false;
		}

		return ourHeader.proposal === undefined && !!peerHeader.proposedBlockId;
	}

	#setDownload(job: DownloadJob) {
		if (!this.#downloadsByHeight.has(job.height)) {
			this.#downloadsByHeight.set(job.height, new Set());
		}

		this.#downloadsByHeight.get(job.height)!.add(job.round);
	}

	#removeDownload(job: DownloadJob) {
		if (!this.#downloadsByHeight.has(job.height)) {
			return;
		}

		this.#downloadsByHeight.get(job.height)!.delete(job.round);

		if (this.#downloadsByHeight.get(job.height)!.size === 0) {
			this.#downloadsByHeight.delete(job.height);
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
			if (proposal.height !== job.height) {
				throw new Error(
					`Received proposal height ${proposal.height} does not match expected height ${job.height}`,
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
