import type { Contracts } from "@mainsail/contracts";
import type { Interfaces } from "@mainsail/p2p-websocket";

import { Identifiers, Units } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { pluralize } from "@mainsail/utils";

import type { RouteDefinition } from "../interfaces/index.js";

import { Codecs } from "../codecs/index.js";
import { constants } from "../constants.js";
import { Schemas } from "../schemas/index.js";

type Request = ReturnType<typeof Codecs.getBlocks.request.deserialize>;
type Response = ReturnType<typeof Codecs.getBlocks.response.deserialize>;

export const GetBlocks: RouteDefinition<Request, Response> = {
	codec: Codecs.getBlocks,
	// The block downloader runs up to MAX_DOWNLOAD_BLOCKS_JOBS batches at once, possibly all from one peer.
	maxConcurrentRequests: 10,
	maxPayload: { request: Units.KILOBYTE, response: 3 * Units.MEGABYTE },
	// A batch that cannot go out at once is better retried from another peer than queued behind the rest.
	maxQueuedRequests: 0,
	path: "getBlocks",
	schema: Schemas.getBlocks,
};

// The block data a response to a request for `limit` blocks may hold, so that its fully serialized frame
// fits what the caller accepts for this route: the route's response limit less the per-block protobuf
// framing, for the worst case of `limit` blocks, and the fixed envelope reserve. The block downloader
// judges a short response against the same number.
export const getBlocksBudget = (limit: number): number =>
	GetBlocks.maxPayload.response - constants.RESPONSE_ENVELOPE_RESERVE - limit * constants.PROTO_BLOCK_OVERHEAD;

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
	public readonly maxPayload = GetBlocks.maxPayload;
	public readonly maxConcurrentRequests = GetBlocks.maxConcurrentRequests;
	public readonly maxQueuedRequests = GetBlocks.maxQueuedRequests;
	public readonly schema = GetBlocks.schema;

	public async handle(connection: Interfaces.Connection, data: Request): Promise<Response> {
		// The request is not validated yet; the bounds keep a bad one from draining the database or the budget.
		const requestBlockNumber = Math.max(data.fromBlockNumber ?? 0, 0);
		const requestBlockLimit = Math.min(
			Math.max(data.limit ?? constants.MAX_DOWNLOAD_BLOCKS, 1),
			constants.MAX_DOWNLOAD_BLOCKS,
		);

		if (requestBlockNumber > this.stateStore.getBlockNumber()) {
			return { blocks: [] };
		}

		const blocks = await this.database.findCommitBuffers(
			requestBlockNumber,
			requestBlockNumber + requestBlockLimit - 1,
			getBlocksBudget(requestBlockLimit),
		);

		this.logger.debug(
			`${connection.remoteAddress} has downloaded ${pluralize("block", blocks.length, true)} from block number ${requestBlockNumber.toLocaleString()}`,
			"p2p",
		);

		return { blocks };
	}
}
