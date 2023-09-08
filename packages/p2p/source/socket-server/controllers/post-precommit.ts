import Hapi from "@hapi/hapi";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { getPeerIp } from "../../utils";

@injectable()
export class PostPrecommitController implements Contracts.P2P.Controller {
	@inject(Identifiers.Consensus.PrecommitProcessor)
	private readonly precommitProcessor!: Contracts.Consensus.IPrecommitProcessor;

	@inject(Identifiers.Cryptography.Message.Factory)
	private readonly factory!: Contracts.Crypto.IMessageFactory;

	@inject(Identifiers.PeerDisposer)
	private readonly peerDisposer!: Contracts.P2P.PeerDisposer;

	@inject(Identifiers.P2PState)
	private readonly state!: Contracts.P2P.State;

	public async handle(
		request: Contracts.P2P.IPostPrecommitRequest,
		h: Hapi.ResponseToolkit,
	): Promise<Contracts.P2P.IPostPrecommitResponse> {
		try {
			const precommit = await this.factory.makePrecommitFromBytes(request.payload.precommit);
			const result = await this.precommitProcessor.process(precommit);

			if (result === Contracts.Consensus.ProcessorResult.Invalid) {
				throw new Error("Invalid precommit");
			}

			this.state.resetLastMessageTime();
		} catch (error) {
			this.peerDisposer.banPeer(getPeerIp(request), error.message);
		}

		return {};
	}
}
