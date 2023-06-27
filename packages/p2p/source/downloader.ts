import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class Downloader {
	@inject(Identifiers.PeerCommunicator)
	private readonly communicator!: Contracts.P2P.PeerCommunicator;

	@inject(Identifiers.StateStore)
	private readonly state!: Contracts.State.StateStore;

	@inject(Identifiers.Consensus.Handler)
	private readonly handler!: Contracts.Consensus.IHandler;

	@inject(Identifiers.Cryptography.Message.Factory)
	private readonly messageFactory!: Contracts.Crypto.IMessageFactory;

	@inject(Identifiers.Cryptography.Block.Factory)
	private readonly blockFactory!: Contracts.Crypto.IBlockFactory;

	public async downloadBlocks(peer: Contracts.P2P.Peer): Promise<void> {
		console.log("Downloading blocks");

		const result = await this.communicator.getBlocks(peer, {
			fromHeight: this.state.getLastBlock().data.height + 1,
		});

		const blocks = await Promise.all(
			result.blocks.map(async (hex) => await this.blockFactory.fromCommittedBytes(Buffer.from(hex, "hex"))),
		);

		console.log("Blocks: ", blocks);
	}

	// TODO: Handle errors & response checks
	public async downloadProposal(peer: Contracts.P2P.Peer): Promise<void> {
		const result = await this.communicator.getProposal(peer);

		if (result.proposal.length === 0) {
			return;
		}

		const proposal = await this.messageFactory.makeProposalFromBytes(Buffer.from(result.proposal, "hex"));

		await this.handler.onProposal(proposal);
	}

	// TODO: Handle errors
	public async downloadMessages(peer: Contracts.P2P.Peer): Promise<void> {
		const result = await this.communicator.getMessages(peer);

		for (const prevoteHex of result.prevotes) {
			const prevote = await this.messageFactory.makePrevoteFromBytes(Buffer.from(prevoteHex, "hex"));

			await this.handler.onPrevote(prevote);
		}

		for (const precommitHex of result.precommits) {
			const precommit = await this.messageFactory.makePrecommitFromBytes(Buffer.from(precommitHex, "hex"));

			await this.handler.onPrecommit(precommit);
		}
	}
}
