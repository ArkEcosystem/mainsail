import { inject } from "@arkecosystem/core-container";
import { Contracts, Identifiers, Exceptions } from "@arkecosystem/core-contracts";
import { DatabaseInterceptor } from "@arkecosystem/core-state";
import { FastifyRequest } from "fastify";

export class GetCommonBlocksController {
	@inject(Identifiers.DatabaseInterceptor)
	private readonly databaseInterceptor!: DatabaseInterceptor;

	@inject(Identifiers.BlockchainService)
	private readonly blockchain!: Contracts.Blockchain.Blockchain;

	public async invoke(request: FastifyRequest): Promise<{
		common: Contracts.Crypto.IBlockData;
		lastBlockHeight: number;
	}> {
		const commonBlocks: Contracts.Crypto.IBlockData[] = await this.databaseInterceptor.getCommonBlocks(
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
