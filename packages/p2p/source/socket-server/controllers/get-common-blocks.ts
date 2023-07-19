import Hapi from "@hapi/hapi";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";

@injectable()
export class GetCommonBlocksController implements Contracts.P2P.Controller {
	@inject(Identifiers.Database.Service)
	private readonly databaseService!: Contracts.Database.IDatabaseService;

	@inject(Identifiers.StateStore)
	private readonly stateStore!: Contracts.State.StateStore;

	public async handle(
		request: Contracts.P2P.IGetCommonBlocksRequest,
		h: Hapi.ResponseToolkit,
	): Promise<Contracts.P2P.IGetCommonBlocksResponse> {
		// @ts-ignore
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
			lastBlockHeight: this.stateStore.getLastBlock().data.height,
		};
	}
}
