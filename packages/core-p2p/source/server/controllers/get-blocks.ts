import { inject } from "@arkecosystem/core-container";
import { Constants, Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Utils } from "@arkecosystem/core-kernel";
import { FastifyRequest } from "fastify";

import { constants } from "../../constants";
import { mapAddr } from "../utils/map-addr";

export class GetBlocksController {
	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.BlockchainService)
	private readonly blockchain!: Contracts.Blockchain.Blockchain;

	@inject(Identifiers.Database.Service)
	private readonly database: Contracts.Database.IDatabaseService;

	public async invoke(
		request: FastifyRequest,
	): Promise<Contracts.Crypto.IBlockData[] | Contracts.Shared.DownloadBlock[]> {
		const requestBlockHeight: number = +(request.body as any).lastBlockHeight + 1;
		const requestBlockLimit: number = +(request.body as any).blockLimit || 400;

		const lastHeight: number = this.blockchain.getLastHeight();
		if (requestBlockHeight > lastHeight) {
			return [];
		}

		const blocks: Contracts.Shared.DownloadBlock[] = await this.database.getBlocksForDownload(
			requestBlockHeight,
			requestBlockLimit,
		);

		// Only return the blocks fetched while we are below the p2p maxPayload limit
		const blocksToReturn: Contracts.Shared.DownloadBlock[] = [];
		const maxPayloadWithMargin = constants.DEFAULT_MAX_PAYLOAD - 100 * Constants.Units.KILOBYTE; // 100KB margin because we're dealing with estimates
		for (let index = 0, sizeEstimate = 0; sizeEstimate < maxPayloadWithMargin && index < blocks.length; index++) {
			blocksToReturn.push(blocks[index]);
			sizeEstimate +=
				blocks[index].transactions?.reduce((accumulator, current) => accumulator + current.length, 0) ?? 0;
			// We estimate the size of each block -- as it will be sent through p2p -- with the length of the
			// associated transactions. When blocks are big, size of the block header is negligible compared to its
			// transactions. And here we just want a broad limit to stop when getting close to p2p max payload.
		}

		this.logger.info(
			`${mapAddr(request.ip)} has downloaded ${Utils.pluralize(
				"block",
				blocksToReturn.length,
				true,
			)} from height ${requestBlockHeight.toLocaleString()}`,
		);

		return blocksToReturn;
	}
}
