import Hapi from "@hapi/hapi";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { getPeerIp } from "../../utils";

@injectable()
export class PostPrevoteController implements Contracts.P2P.Controller {
	@inject(Identifiers.Consensus.PrevoteProcessor)
	private readonly prevoteProcessor!: Contracts.Consensus.IPrevoteProcessor;

	@inject(Identifiers.Cryptography.Message.Factory)
	private readonly factory!: Contracts.Crypto.IMessageFactory;

	@inject(Identifiers.PeerDisposer)
	private readonly peerDisposer!: Contracts.P2P.PeerDisposer;

	@inject(Identifiers.PeerRepository)
	private readonly peerRepository!: Contracts.P2P.PeerRepository;

	@inject(Identifiers.P2PState)
	private readonly state!: Contracts.P2P.State;

	public async handle(
		request: Contracts.P2P.IPostPrevoteRequest,
		h: Hapi.ResponseToolkit,
	): Promise<Contracts.P2P.IPostPrevoteResponse> {
		try {
			const prevote = await this.factory.makePrevoteFromBytes(request.payload.prevote);

			const result = await this.prevoteProcessor.process(prevote);

			if (result === Contracts.Consensus.ProcessorResult.Invalid) {
				throw new Error("Invalid prevote");
			}

			this.state.updateLastMessage();
		} catch (error) {
			this.peerDisposer.banPeer(this.peerRepository.getPeer(getPeerIp(request)), error.message);
		}

		return {};
	}
}
