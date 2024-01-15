import Hapi from "@hapi/hapi";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { getPeerIp } from "../../utils";

@injectable()
export class PostPrevoteController implements Contracts.P2P.Controller {
	@inject(Identifiers.Consensus.PrevoteProcessor)
	private readonly prevoteProcessor!: Contracts.Consensus.PrevoteProcessor;

	@inject(Identifiers.Cryptography.Message.Factory)
	private readonly factory!: Contracts.Crypto.MessageFactory;

	@inject(Identifiers.P2P.Peer.Disposer)
	private readonly peerDisposer!: Contracts.P2P.PeerDisposer;

	@inject(Identifiers.P2P.State)
	private readonly state!: Contracts.P2P.State;

	public async handle(
		request: Contracts.P2P.PostPrevoteRequest,
		h: Hapi.ResponseToolkit,
	): Promise<Contracts.P2P.PostPrevoteResponse> {
		try {
			const prevote = await this.factory.makePrevoteFromBytes(request.payload.prevote);

			const result = await this.prevoteProcessor.process(prevote);

			if (result === Contracts.Consensus.ProcessorResult.Invalid) {
				throw new Error("Invalid prevote");
			}

			this.state.resetLastMessageTime();
		} catch (error) {
			this.peerDisposer.banPeer(getPeerIp(request), error.message);
		}

		return {};
	}
}
