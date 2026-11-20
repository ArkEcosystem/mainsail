import type { Contracts } from "@mainsail/contracts";
import type { Interfaces } from "@mainsail/p2p-websocket";

import { Enums, Identifiers, Units } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { ensureError } from "@mainsail/utils";

import { Codecs } from "../codecs/index.js";
import { Schemas } from "../schemas/index.js";

type Request = ReturnType<typeof Codecs.postMessage.request.deserialize>;
type Response = ReturnType<typeof Codecs.postMessage.response.deserialize>;

export const PostMessage: Interfaces.RouteDefinition<Request, Response> = {
	codec: Codecs.postMessage,
	maxConcurrentRequests: 8,
	maxPayload: { request: Units.KILOBYTE, response: Units.KILOBYTE },
	maxQueuedRequests: 8,
	path: "postMessage",
	schema: Schemas.postMessage,
};

// A message that cannot be read or fails the checks of the consensus costs its sender a ban, as in
// @mainsail/p2p: an honest peer forwards only what it accepted itself.
@injectable()
export class PostMessageRoute implements Interfaces.Route<Request, Response> {
	@inject(Identifiers.Consensus.Processor.Message)
	private readonly messageProcessor!: Contracts.Consensus.MessageProcessor;

	@inject(Identifiers.Cryptography.Message.Factory)
	private readonly factory!: Contracts.Crypto.MessageFactory;

	@inject(Identifiers.P2P.Peer.Disposer)
	private readonly peerDisposer!: Contracts.P2PService.PeerDisposer;

	public readonly path = PostMessage.path;
	public readonly codec = PostMessage.codec;
	public readonly maxPayload = PostMessage.maxPayload;
	public readonly maxConcurrentRequests = PostMessage.maxConcurrentRequests;
	public readonly maxQueuedRequests = PostMessage.maxQueuedRequests;
	public readonly schema = PostMessage.schema;

	public async handle(connection: Interfaces.Connection, data: Request): Promise<Response> {
		try {
			const message = await this.factory.makeMessageFromBytes(data.message);
			if ((await this.messageProcessor.process(message)) === Enums.Consensus.ProcessorResult.Invalid) {
				throw new Error("Invalid message");
			}
		} catch (rawError) {
			this.peerDisposer.banPeer(connection.remoteAddress, ensureError(rawError));
		}

		return {};
	}
}
