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

	@inject(Identifiers.PeerRepository)
	private readonly peerRepository!: Contracts.P2P.PeerRepository;

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
		} catch (error) {
			this.peerDisposer.banPeer(this.peerRepository.getPeer(getPeerIp(request)), error.message);
		}

		return {};
	}
}
