import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { randomNumber } from "@mainsail/utils";

@injectable()
export class Downloader {
	@inject(Identifiers.PeerCommunicator)
	private readonly communicator!: Contracts.P2P.PeerCommunicator;

	@inject(Identifiers.PeerRepository)
	private readonly repository!: Contracts.P2P.PeerRepository;

	@inject(Identifiers.PeerHeaderFactory)
	private readonly headerFactory!: Contracts.P2P.HeaderFactory;

	@inject(Identifiers.StateStore)
	private readonly state!: Contracts.State.StateStore;

	@inject(Identifiers.Consensus.Handler)
	private readonly handler!: Contracts.Consensus.IHandler;

	@inject(Identifiers.Cryptography.Message.Factory)
	private readonly messageFactory!: Contracts.Crypto.IMessageFactory;

	@inject(Identifiers.Cryptography.Block.Factory)
	private readonly blockFactory!: Contracts.Crypto.IBlockFactory;

	#isDownloadingBlocks = false;
	#isDownloadingProposal = false;
	#isDownloadingMessages = false;

	public tryToDownloadBlocks(): void {
		const header = this.headerFactory();
		const peers = this.repository.getPeers().filter((peer) => header.canDownloadBlocks(peer.state));

		if (peers.length > 0) {
			void this.downloadBlocks(this.#getRandomPeer(peers));
		}
	}

	public tryToDownloadProposal(): void {
		const header = this.headerFactory();
		const peers = this.repository.getPeers().filter((peer) => header.canDownloadProposal(peer.state));

		if (peers.length > 0) {
			void this.downloadProposal(this.#getRandomPeer(peers));
		}
	}

	public tryToDownloadMessages(): void {
		const header = this.headerFactory();
		const peers = this.repository.getPeers().filter((peer) => header.canDownloadMessages(peer.state));

		if (peers.length > 0) {
			void this.downloadMessages(this.#getRandomPeer(peers));
		}
	}

	public async downloadBlocks(peer: Contracts.P2P.Peer): Promise<void> {
		if (this.#isDownloadingBlocks) {
			return;
		}

		this.#isDownloadingBlocks = true;

		try {
			const result = await this.communicator.getBlocks(peer, {
				fromHeight: this.state.getLastBlock().data.height + 1,
			});

			const blocks = await Promise.all(
				result.blocks.map(async (buff) => await this.blockFactory.fromCommittedBytes(buff)),
			);

			for (const block of blocks) {
				await this.handler.onCommittedBlock(block);
			}
		} catch {
			// TODO: Handle errors
		} finally {
			this.#isDownloadingBlocks = false;
			this.tryToDownloadBlocks();
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

	// TODO: Handle errors
	public async downloadMessages(peer: Contracts.P2P.Peer): Promise<void> {
		if (this.#isDownloadingMessages) {
			return;
		}

		this.#isDownloadingMessages = true;

		try {
			const result = await this.communicator.getMessages(peer);

			for (const prevoteBuffer of result.prevotes) {
				const prevote = await this.messageFactory.makePrevoteFromBytes(prevoteBuffer);

				await this.handler.onPrevote(prevote);
			}

			for (const precommitBuffer of result.precommits) {
				const precommit = await this.messageFactory.makePrecommitFromBytes(precommitBuffer);

				await this.handler.onPrecommit(precommit);
			}
		} catch {
			// TODO: Handle errors
		} finally {
			this.#isDownloadingMessages = false;
			this.tryToDownloadMessages();
		}
	}

	#getRandomPeer(peers: Contracts.P2P.Peer[]): Contracts.P2P.Peer {
		return peers[randomNumber(0, peers.length - 1)];
	}
}
