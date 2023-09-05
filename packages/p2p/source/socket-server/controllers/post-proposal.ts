import Hapi from "@hapi/hapi";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { getPeerIp } from "../../utils";

@injectable()
export class PostProposalController implements Contracts.P2P.Controller {
	@inject(Identifiers.Consensus.ProposalProcessor)
	private readonly proposalProcessor!: Contracts.Consensus.IProposalProcessor;

	@inject(Identifiers.Cryptography.Message.Factory)
	private readonly factory!: Contracts.Crypto.IMessageFactory;

	@inject(Identifiers.PeerDisposer)
	private readonly peerDisposer!: Contracts.P2P.PeerDisposer;

	@inject(Identifiers.PeerRepository)
	private readonly peerRepository!: Contracts.P2P.PeerRepository;

	@inject(Identifiers.P2PState)
	private readonly state!: Contracts.P2P.State;

	public async handle(
		request: Contracts.P2P.IPostProposalRequest,
		h: Hapi.ResponseToolkit,
	): Promise<Contracts.P2P.IPostProposalResponse> {
		try {
			const proposal = await this.factory.makeProposalFromBytes(request.payload.proposal);
			const result = await this.proposalProcessor.process(proposal);

			if (result === Contracts.Consensus.ProcessorResult.Invalid) {
				throw new Error("Invalid proposal");
			}

			this.state.updateLastMessage();
		} catch (error) {
			this.peerDisposer.banPeer(this.peerRepository.getPeer(getPeerIp(request)), error.message);
		}

		return {};
	}
}
