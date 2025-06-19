import Hapi from "@hapi/hapi";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
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

		const commits: Buffer[] = await this.database.findCommitBuffers(
			requestBlockNumber,
			requestBlockNumber + requestBlockLimit - 1,
		);

		// Only return the blocks fetched while we are below the p2p maxPayload limit
		const blocksToReturn: Buffer[] = [];
		const maxPayload = constants.MAX_PAYLOAD_CLIENT;
		let totalSize = 0;

		for (const commit of commits) {
			totalSize += commit.length;
			if (totalSize > maxPayload) {
				break;
			}

			blocksToReturn.push(commit);
		}

		this.logger.info(
			`${mapAddr(request.info.remoteAddress)} has downloaded ${pluralize(
				"block",
				blocksToReturn.length,
				true,
			)} from block number ${requestBlockNumber.toLocaleString()}`,
		);

		return { blocks: blocksToReturn };
	}
}
