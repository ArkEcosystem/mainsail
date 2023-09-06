import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { getRandomPeer } from "../utils";

type DownloadJob = {
	peer: Contracts.P2P.Peer;
	peerHeader: Contracts.P2P.IHeaderData;
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
	private readonly factory!: Contracts.Crypto.IMessageFactory;

	@inject(Identifiers.Consensus.ProposalProcessor)
	private readonly proposalProcessor!: Contracts.Consensus.IProposalProcessor;

	@inject(Identifiers.P2PState)
	private readonly state!: Contracts.P2P.State;

	#downloadingProposalByHeight = new Set<number>();

	public tryToDownload(): void {
		if (this.blockDownloader.isDownloading()) {
			return;
		}

		const header = this.headerFactory();
		const peers = this.repository.getPeers().filter((peer) => header.canDownloadProposal(peer.header));

		if (peers.length > 0) {
			this.download(getRandomPeer(peers));
		}
	}

	public download(peer: Contracts.P2P.Peer): void {
		if (this.blockDownloader.isDownloading()) {
			return;
		}

		if (this.#downloadingProposalByHeight.has(peer.header.height)) {
			return;
		}

		const header = this.headerFactory();
		if (!header.canDownloadProposal(peer.header)) {
			return;
		}

		this.#downloadingProposalByHeight.add(peer.header.height);

		void this.#downloadProposalFromPeer({ peer, peerHeader: peer.header });
	}

	public isDownloading(): boolean {
		return this.#downloadingProposalByHeight.size > 0;
	}

	async #downloadProposalFromPeer(job: DownloadJob): Promise<void> {
		let error: Error | undefined;

		try {
			const result = await this.communicator.getProposal(job.peer);

			if (result.proposal.length === 0) {
				return;
			}

			const proposal = await this.factory.makeProposalFromBytes(result.proposal);
			if (proposal.height !== job.peerHeader.height) {
				throw new Error(
					`Received proposal height ${proposal.height} does not match expected height ${job.peerHeader.height}`,
				);
			}

			if (proposal.round !== job.peerHeader.round) {
				throw new Error(
					`Received proposal round ${proposal.round} does not match expected round ${job.peerHeader.round}`,
				);
			}

			const response = await this.proposalProcessor.process(proposal, false);
			if (response === Contracts.Consensus.ProcessorResult.Invalid) {
				throw new Error(`Received proposal is invalid`);
			}

			this.state.resetLastMessageTime();
		} catch (error_) {
			error = error_;
		}

		this.#downloadingProposalByHeight.delete(job.peerHeader.height);

		if (error) {
			this.peerDisposer.banPeer(job.peer, error);
			this.tryToDownload();
		}
	}
}
