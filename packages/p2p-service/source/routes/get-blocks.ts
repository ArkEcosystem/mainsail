import type { Contracts } from "@mainsail/contracts";
import type { Interfaces } from "@mainsail/p2p-websocket";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { pluralize } from "@mainsail/utils";

import { Codecs } from "../codecs/index.js";
import { constants } from "../constants.js";

type Request = ReturnType<typeof Codecs.getBlocks.request.deserialize>;
type Response = ReturnType<typeof Codecs.getBlocks.response.deserialize>;

export const GetBlocks: Interfaces.RouteDefinition<Request, Response> = { codec: Codecs.getBlocks, path: "getBlocks" };

@injectable()
export class GetBlocksRoute implements Interfaces.Route<Request, Response> {
	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.State.Store)
	private readonly stateStore!: Contracts.State.Store;

	@inject(Identifiers.Database.Service)
	private readonly database!: Contracts.Database.DatabaseService;

	public readonly path = GetBlocks.path;
	public readonly codec = GetBlocks.codec;

	public async handle(connection: Interfaces.Connection, data: Request): Promise<Response> {
		const requestBlockNumber = data.fromBlockNumber ?? 0;
		const requestBlockLimit = data.limit ?? constants.MAX_DOWNLOAD_BLOCKS;

		if (requestBlockNumber > this.stateStore.getBlockNumber()) {
			return { blocks: [] };
		}

		// Budget the response so its fully serialized frame fits the client's maxPayload: raw block data plus
		// the per-block protobuf framing and the fixed envelope reserve, for the worst case of `limit` blocks.
		const maxBytes =
			constants.MAX_PAYLOAD_CLIENT -
			constants.RESPONSE_ENVELOPE_RESERVE -
			requestBlockLimit * constants.PROTO_BLOCK_OVERHEAD;

		const blocks = await this.database.findCommitBuffers(
			requestBlockNumber,
			requestBlockNumber + requestBlockLimit - 1,
			maxBytes,
		);

		this.logger.debug(
			`${connection.remoteAddress} has downloaded ${pluralize("block", blocks.length, true)} from block number ${requestBlockNumber.toLocaleString()}`,
			"p2p",
		);

		return { blocks };
	}
}
