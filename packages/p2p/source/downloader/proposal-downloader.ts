import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { getRandomPeer } from "../utils";

type DownloadJob = {
	peer: Contracts.P2P.Peer;
	height: number;
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

	@inject(Identifiers.PeerBlocker)
	private readonly peerBlocker!: Contracts.P2P.PeerDisposer;

	@inject(Identifiers.Consensus.Handler)
	private readonly handler!: Contracts.Consensus.IHandler;

	@inject(Identifiers.Cryptography.Message.Factory)
	private readonly messageFactory!: Contracts.Crypto.IMessageFactory;

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

		void this.#downloadProposalFromPeer({ height: peer.state.height, peer });
	}

	public isDownloading(): boolean {
		return this.#downloadingProposalByHeight.size > 0;
	}

	// TODO: Handle errors & response checks
	async #downloadProposalFromPeer(job: DownloadJob): Promise<void> {
		let isError = false;

		try {
			const result = await this.communicator.getProposal(job.peer);

			if (result.proposal.length === 0) {
				return;
			}

			const proposal = await this.messageFactory.makeProposalFromBytes(result.proposal);

			await this.handler.onProposal(proposal);
		} catch {
			isError = true;
		}

		this.#downloadingProposalByHeight.delete(job.height);

		if (isError) {
			this.peerBlocker.blockPeer(job.peer);
			this.tryToDownload();
		}
	}
}
