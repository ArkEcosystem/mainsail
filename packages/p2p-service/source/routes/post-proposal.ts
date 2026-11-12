import type { Contracts } from "@mainsail/contracts";
import type { Interfaces } from "@mainsail/p2p-websocket";

import { Enums, Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { ensureError } from "@mainsail/utils";

import { Codecs } from "../codecs/index.js";

type Request = ReturnType<typeof Codecs.postProposal.request.deserialize>;
type Response = ReturnType<typeof Codecs.postProposal.response.deserialize>;

export const PostProposal: Interfaces.RouteDefinition<Request, Response> = {
	codec: Codecs.postProposal,
	path: "postProposal",
};

// An invalid proposal is logged instead of banning the peer; peers are trusted until the disposer is ported.
@injectable()
export class PostProposalRoute implements Interfaces.Route<Request, Response> {
	@inject(Identifiers.Consensus.Processor.Proposal)
	private readonly proposalProcessor!: Contracts.Consensus.ProposalProcessor;

	@inject(Identifiers.Cryptography.Proposal.Factory)
	private readonly factory!: Contracts.Crypto.ProposalFactory;

	@inject(Identifiers.P2P.State)
	private readonly state!: Contracts.P2P.State;

	@inject(Identifiers.P2P.Logger)
	private readonly logger!: Contracts.P2P.Logger;

	public readonly path = PostProposal.path;
	public readonly codec = PostProposal.codec;

	public async handle(connection: Interfaces.Connection, data: Request): Promise<Response> {
		try {
			const proposal = await this.factory.makeProposalFromBytes(Buffer.from(data.proposal ?? []));
			if ((await this.proposalProcessor.process(proposal)) === Enums.Consensus.ProcessorResult.Invalid) {
				throw new Error("Invalid proposal");
			}

			this.state.resetLastMessageTime();
		} catch (rawError) {
			this.logger.debug(
				`Rejected proposal from ${connection.remoteAddress}: ${ensureError(rawError).message}`,
				"p2p",
			);
		}

		return {};
	}
}
