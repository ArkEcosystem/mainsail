import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Exceptions, Identifiers } from "@arkecosystem/core-contracts";
import Hapi from "@hapi/hapi";

@injectable()
export class GetCommonBlocksController implements Contracts.P2P.Controller {
	@inject(Identifiers.Database.Service)
	private readonly databaseService!: Contracts.Database.IDatabaseService;

	@inject(Identifiers.BlockchainService)
	private readonly blockchain!: Contracts.Blockchain.Blockchain;

	public async handle(
		request: Hapi.Request,
		h: Hapi.ResponseToolkit,
	): Promise<{
		common: Contracts.Crypto.IBlockData;
		lastBlockHeight: number;
	}> {
		const commonBlocks: Contracts.Crypto.IBlockData[] = await Promise.all(
			(request.payload as any).ids.map(async (blockId) => await this.databaseService.getBlock(blockId)),
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
