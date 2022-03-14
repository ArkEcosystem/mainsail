import { inject } from "@arkecosystem/core-container";
import { Contracts, Exceptions, Identifiers } from "@arkecosystem/core-contracts";
import { FastifyRequest } from "fastify";

export class GetCommonBlocksController {
	@inject(Identifiers.Database.Service)
	private readonly databaseService!: Contracts.Database.IDatabaseService;

	@inject(Identifiers.BlockchainService)
	private readonly blockchain!: Contracts.Blockchain.Blockchain;

	public async invoke(request: FastifyRequest): Promise<{
		common: Contracts.Crypto.IBlockData;
		lastBlockHeight: number;
	}> {
		const commonBlocks: Contracts.Crypto.IBlockData[] = await this.databaseService.findBlocksByIds(
			(request.body as any).ids,
		);

		if (commonBlocks.length === 0) {
			throw new Exceptions.MissingCommonBlockError();
		}

		return {
			common: commonBlocks.sort((a, b) => a.height - b.height)[commonBlocks.length - 1],
			lastBlockHeight: this.blockchain.getLastBlock().data.height,
		};
	}
}
