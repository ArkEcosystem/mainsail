import Hapi from "@hapi/hapi";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { getPeerIp } from "../../utils/index.js";

@injectable()
export class PostProposalController implements Contracts.P2P.Controller {
	@inject(Identifiers.Consensus.Processor.Proposal)
	private readonly proposalProcessor!: Contracts.Consensus.ProposalProcessor;

	@inject(Identifiers.Cryptography.Message.Factory)
	private readonly factory!: Contracts.Crypto.MessageFactory;

	@inject(Identifiers.P2P.Peer.Disposer)
	private readonly peerDisposer!: Contracts.P2P.PeerDisposer;

	@inject(Identifiers.P2P.State)
	private readonly state!: Contracts.P2P.State;

	public async handle(
		request: Contracts.P2P.PostProposalRequest,
		h: Hapi.ResponseToolkit,
	): Promise<Contracts.P2P.PostProposalResponse> {
		try {
			const proposal = await this.factory.makeProposalFromBytes(request.payload.proposal);
			const result = await this.proposalProcessor.process(proposal);

			if (result === Contracts.Consensus.ProcessorResult.Invalid) {
				throw new Error("Invalid proposal");
			}

			this.state.resetLastMessageTime();
		} catch (error) {
			this.peerDisposer.banPeer(getPeerIp(request), error.message);
		}

		return {};
	}
}
