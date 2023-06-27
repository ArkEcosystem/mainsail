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
	private readonly factory!: Contracts.Crypto.IMessageFactory;

	public async downloadBlocks(peer: Contracts.P2P.Peer): Promise<void> {
		const result = await this.communicator.getBlocks(peer, {
			fromHeight: this.state.getLastBlock().data.height + 1,
		});

		console.log(result);
	}

	// TODO: Handle errors & response checks
	public async downloadProposal(peer: Contracts.P2P.Peer): Promise<void> {
		const result = await this.communicator.getProposal(peer);

		if (result.proposal.length === 0) {
			return;
		}

		const proposal = await this.factory.makeProposalFromBytes(Buffer.from(result.proposal, "hex"));

		await this.handler.onProposal(proposal);
	}

	// TODO: Handle errors
	public async downloadMessages(peer: Contracts.P2P.Peer): Promise<void> {
		const result = await this.communicator.getMessages(peer);

		for (const prevoteHex of result.prevotes) {
			const prevote = await this.factory.makePrevoteFromBytes(Buffer.from(prevoteHex, "hex"));

			await this.handler.onPrevote(prevote);
		}

		for (const precommitHex of result.precommits) {
			const precommit = await this.factory.makePrecommitFromBytes(Buffer.from(precommitHex, "hex"));

			await this.handler.onPrecommit(precommit);
		}
	}
}
