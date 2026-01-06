import Hapi from "@hapi/hapi";
import { Enums, Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";

import { getPeerIp } from "../../utils/index.js";

@injectable()
export class PostPrevoteController implements Contracts.P2P.Controller {
	@inject(Identifiers.Consensus.Processor.PreVote)
	private readonly messageProcessor!: Contracts.Consensus.MessageProcessor;

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
			const prevote = await this.factory.makeMessageFromBytes(request.payload.prevote);

			const result = await this.messageProcessor.process(prevote);

			if (result === Enums.Consensus.ProcessorResult.Invalid) {
				throw new Error("Invalid prevote");
			}

			this.state.resetLastMessageTime();
		} catch (error) {
			this.peerDisposer.banPeer(getPeerIp(request), error.message);
		}

		return {};
	}
}
