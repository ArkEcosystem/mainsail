import type { Contracts } from "@mainsail/contracts";
import type { Interfaces } from "@mainsail/p2p-websocket";

import { Enums, Identifiers, Units } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { ensureError } from "@mainsail/utils";

import { Codecs } from "../codecs/index.js";

type Request = ReturnType<typeof Codecs.postProposal.request.deserialize>;
type Response = ReturnType<typeof Codecs.postProposal.response.deserialize>;

export const PostProposal: Interfaces.RouteDefinition<Request, Response> = {
	codec: Codecs.postProposal,
	// One proposal per round; a second one in flight covers the round changing while the peer is slow.
	maxConcurrentRequests: 2,
	maxPayload: { request: 3 * Units.MEGABYTE, response: Units.KILOBYTE },
	maxQueuedRequests: 2,
	path: "postProposal",
};

// A proposal that cannot be read or fails the checks of the consensus costs its sender a ban, as in
// @mainsail/p2p: an honest peer forwards only what it accepted itself.
@injectable()
export class PostProposalRoute implements Interfaces.Route<Request, Response> {
	@inject(Identifiers.Consensus.Processor.Proposal)
	private readonly proposalProcessor!: Contracts.Consensus.ProposalProcessor;

	@inject(Identifiers.Cryptography.Proposal.Factory)
	private readonly factory!: Contracts.Crypto.ProposalFactory;

	@inject(Identifiers.P2P.Peer.Disposer)
	private readonly peerDisposer!: Contracts.P2PService.PeerDisposer;

	public readonly path = PostProposal.path;
	public readonly codec = PostProposal.codec;
	public readonly maxPayload = PostProposal.maxPayload;
	public readonly maxConcurrentRequests = PostProposal.maxConcurrentRequests;
	public readonly maxQueuedRequests = PostProposal.maxQueuedRequests;

	public async handle(connection: Interfaces.Connection, data: Request): Promise<Response> {
		try {
			const proposal = await this.factory.makeProposalFromBytes(Buffer.from(data.proposal ?? []));
			if ((await this.proposalProcessor.process(proposal)) === Enums.Consensus.ProcessorResult.Invalid) {
				throw new Error("Invalid proposal");
			}
		} catch (rawError) {
			this.peerDisposer.banPeer(connection.remoteAddress, ensureError(rawError));
		}

		return {};
	}
}
