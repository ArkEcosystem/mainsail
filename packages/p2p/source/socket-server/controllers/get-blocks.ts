import type { Contracts } from "@mainsail/contracts";

import Hapi from "@hapi/hapi";
import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { pluralize } from "@mainsail/utils";

import { constants } from "../../constants.js";
import { mapAddr } from "../utils/map-addr.js";

@injectable()
export class GetBlocksController implements Contracts.P2P.Controller {
	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.State.Store)
	private readonly stateStore!: Contracts.State.Store;

	@inject(Identifiers.Database.Service)
	private readonly database!: Contracts.Database.DatabaseService;

	public async handle(
		request: Contracts.P2P.GetBlocksRequest,
		h: Hapi.ResponseToolkit,
	): Promise<Contracts.P2P.GetBlocksResponse> {
		const requestBlockNumber: number = request.payload.fromBlockNumber;
		const requestBlockLimit: number = request.payload.limit;

		const lastBlockNumber: number = this.stateStore.getBlockNumber();
		if (requestBlockNumber > lastBlockNumber) {
			return { blocks: [] };
		}

		// Budget the response so its fully serialized frame fits the client's WS maxPayload. readCommits
		// returns at most `maxBytes` of raw block data without overfetching; on top of that the protobuf
		// encoding adds up to PROTO_BLOCK_OVERHEAD per block, and the frame carries a fixed nes envelope +
		// protobuf `headers` field (RESPONSE_ENVELOPE_RESERVE). Reserving both up front — for the worst
		// case of `requestBlockLimit` blocks — keeps the encoded frame within MAX_PAYLOAD_CLIENT (see
		// hapi-nes/client.ts), so the returned buffers can be relayed as-is.
		const maxBytes =
			constants.MAX_PAYLOAD_CLIENT -
			constants.RESPONSE_ENVELOPE_RESERVE -
			requestBlockLimit * constants.PROTO_BLOCK_OVERHEAD;

		const blocks: Buffer[] = await this.database.findCommitBuffers(
			requestBlockNumber,
			requestBlockNumber + requestBlockLimit - 1,
			maxBytes,
		);

		this.logger.info(
			`${mapAddr(request.info.remoteAddress)} has downloaded ${pluralize(
				"block",
				blocks.length,
				true,
			)} from block number ${requestBlockNumber.toLocaleString()}`,
			"p2p",
		);

		return { blocks };
	}
}
