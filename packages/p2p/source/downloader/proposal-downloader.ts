import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { getRandomPeer } from "../utils";

type DownloadJob = {
	peer: Contracts.P2P.Peer;
	peerHeight: number;
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

	#downloadingProposalByHeight = new Set<number>();

	public tryToDownload(): void {
		if (this.blockDownloader.isDownloading()) {
			return;
		}

		const header = this.headerFactory();
		const peers = this.repository.getPeers().filter((peer) => header.canDownloadProposal(peer.state));

		if (peers.length > 0) {
			this.download(getRandomPeer(peers));
		}
	}

	public download(peer: Contracts.P2P.Peer): void {
		if (this.blockDownloader.isDownloading()) {
			return;
		}

		if (this.#downloadingProposalByHeight.has(peer.state.height)) {
			return;
		}

		const header = this.headerFactory();
		if (!header.canDownloadProposal(peer.state)) {
			return;
		}

		this.#downloadingProposalByHeight.add(peer.state.height);

		void this.#downloadProposalFromPeer({ peerHeight: peer.state.height, peer });
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
			if (proposal.height !== job.peerHeight) {
				throw new Error(
					`Received proposal height ${proposal.height} does not match expected height ${job.peerHeight}`,
				);
			}

			const response = await this.proposalProcessor.process(proposal, false);
			if (response === Contracts.Consensus.ProcessorResult.Invalid) {
				throw new Error(`Received proposal is invalid`);
			}
		} catch (error_) {
			error = error_;
		}

		this.#downloadingProposalByHeight.delete(job.peerHeight);

		if (error) {
			this.peerDisposer.banPeer(job.peer, `Error downloading or processing proposal - ${error.message}}`);
			this.tryToDownload();
		}
	}
}
