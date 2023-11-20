import Hapi from "@hapi/hapi";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

import { constants } from "../../constants";
import { mapAddr } from "../utils/map-addr";

@injectable()
export class GetBlocksController implements Contracts.P2P.Controller {
	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.StateService)
	private readonly stateService!: Contracts.State.Service;

	@inject(Identifiers.Database.Service)
	private readonly database!: Contracts.Database.IDatabaseService;

	public async handle(
		request: Contracts.P2P.IGetBlocksRequest,
		h: Hapi.ResponseToolkit,
	): Promise<Contracts.P2P.IGetBlocksResponse> {
		const requestBlockHeight: number = request.payload.fromHeight;
		const requestBlockLimit: number = request.payload.limit || 400;

		const lastHeight: number = this.stateService.getStateStore().getLastHeight();
		if (requestBlockHeight > lastHeight) {
			return { blocks: [] };
		}

		const committedBlocks: Buffer[] = await this.database.findCommitBuffers(
			requestBlockHeight,
			requestBlockHeight + requestBlockLimit - 1,
		);

		// Only return the blocks fetched while we are below the p2p maxPayload limit
		const blocksToReturn: Buffer[] = [];
		const maxPayloadWithMargin = constants.DEFAULT_MAX_PAYLOAD;
		let totalSize = 0;

		for (const committedBlock of committedBlocks) {
			totalSize += committedBlock.length;
			if (totalSize > maxPayloadWithMargin) {
				break;
			}

			blocksToReturn.push(committedBlock);
		}

		this.logger.info(
			`${mapAddr(request.info.remoteAddress)} has downloaded ${Utils.pluralize(
				"block",
				blocksToReturn.length,
				true,
			)} from height ${requestBlockHeight.toLocaleString()}`,
		);

		return { blocks: blocksToReturn };
	}
}
