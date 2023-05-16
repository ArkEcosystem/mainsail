import Hapi from "@hapi/hapi";
import { Contracts, Exceptions } from "@mainsail/contracts";

interface Request extends Hapi.Request {
	payload: {
		ids: string[];
	};
}

@injectable()
export class GetCommonBlocksController implements Contracts.P2P.Controller {
	@inject(Identifiers.Database.Service)
	private readonly databaseService!: Contracts.Database.IDatabaseService;

	@inject(Identifiers.BlockchainService)
	private readonly blockchain!: Contracts.Blockchain.Blockchain;

	public async handle(
		request: Request,
		h: Hapi.ResponseToolkit,
	): Promise<{
		common: Contracts.Crypto.IBlockData;
		lastBlockHeight: number;
	}> {
		const commonBlocks: Contracts.Crypto.IBlock[] = (
			await Promise.all(request.payload.ids.map(async (blockId) => await this.databaseService.getBlock(blockId)))
		).filter((block) => !!block);

		if (commonBlocks.length === 0) {
			throw new Exceptions.MissingCommonBlockError();
		}

		return {
			common: commonBlocks.map((block) => block.data).sort((a, b) => a.height - b.height)[
				commonBlocks.length - 1
			],
			lastBlockHeight: this.blockchain.getLastBlock().data.height,
		};
	}
}
