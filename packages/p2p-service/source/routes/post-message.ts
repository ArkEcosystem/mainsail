import type { Contracts } from "@mainsail/contracts";
import type { Interfaces } from "@mainsail/p2p-websocket";

import { Enums, Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { ensureError } from "@mainsail/utils";

import { Codecs } from "../codecs/index.js";

type Request = ReturnType<typeof Codecs.postMessage.request.deserialize>;
type Response = ReturnType<typeof Codecs.postMessage.response.deserialize>;

export const PostMessage: Interfaces.RouteDefinition<Request, Response> = {
	codec: Codecs.postMessage,
	path: "postMessage",
};

// An invalid message is logged instead of banning the peer; peers are trusted until the disposer is ported.
@injectable()
export class PostMessageRoute implements Interfaces.Route<Request, Response> {
	@inject(Identifiers.Consensus.Processor.Message)
	private readonly messageProcessor!: Contracts.Consensus.MessageProcessor;

	@inject(Identifiers.Cryptography.Message.Factory)
	private readonly factory!: Contracts.Crypto.MessageFactory;

	@inject(Identifiers.P2P.State)
	private readonly state!: Contracts.P2P.State;

	@inject(Identifiers.P2P.Logger)
	private readonly logger!: Contracts.P2P.Logger;

	public readonly path = PostMessage.path;
	public readonly codec = PostMessage.codec;

	public async handle(connection: Interfaces.Connection, data: Request): Promise<Response> {
		try {
			const message = await this.factory.makeMessageFromBytes(Buffer.from(data.message ?? []));
			if ((await this.messageProcessor.process(message)) === Enums.Consensus.ProcessorResult.Invalid) {
				throw new Error("Invalid message");
			}

			this.state.resetLastMessageTime();
		} catch (rawError) {
			this.logger.debug(
				`Rejected message from ${connection.remoteAddress}: ${ensureError(rawError).message}`,
				"p2p",
			);
		}

		return {};
	}
}
