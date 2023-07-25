import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { randomNumber } from "@mainsail/utils";

@injectable()
export class ProposalDownloader {
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

	#isDownloadingProposal = false;

	public tryToDownloadProposal(): void {
		const header = this.headerFactory();
		const peers = this.repository.getPeers().filter((peer) => header.canDownloadProposal(peer.state));

		if (peers.length > 0) {
			void this.downloadProposal(this.#getRandomPeer(peers));
		}
	}

	// TODO: Handle errors & response checks
	public async downloadProposal(peer: Contracts.P2P.Peer): Promise<void> {
		if (this.#isDownloadingProposal) {
			return;
		}

		this.#isDownloadingProposal = true;

		try {
			const result = await this.communicator.getProposal(peer);

			if (result.proposal.length === 0) {
				return;
			}

			const proposal = await this.messageFactory.makeProposalFromBytes(result.proposal);

			await this.handler.onProposal(proposal);
		} catch {
			// TODO: Handle errors
		} finally {
			this.#isDownloadingProposal = false;
			this.tryToDownloadProposal();
		}

		// TODO: Check if we have any missing blocks
	}

	#getRandomPeer(peers: Contracts.P2P.Peer[]): Contracts.P2P.Peer {
		return peers[randomNumber(0, peers.length - 1)];
	}
}
