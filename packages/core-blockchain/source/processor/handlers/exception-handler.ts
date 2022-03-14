import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Utils } from "@arkecosystem/core-kernel";

import { BlockHandler, BlockProcessorResult } from "../contracts";
import { AcceptBlockHandler } from "./accept-block-handler";

@injectable()
export class ExceptionHandler implements BlockHandler {
	@inject(Identifiers.Application)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.BlockchainService)
	protected readonly blockchain!: Contracts.Blockchain.Blockchain;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Database.Service)
	private readonly databaseService!: Contracts.Database.IDatabaseService;

	public async execute(block: Contracts.Crypto.IBlock): Promise<BlockProcessorResult> {
		Utils.assert.defined<string>(block.data.id);

		const id: string = block.data.id;

		// Ensure the block has not been forged yet, as an exceptional block bypasses all other checks.
		const forgedBlock: Contracts.Crypto.IBlock | undefined = await this.databaseService.getBlock(id);

		if (forgedBlock || block.data.height !== this.blockchain.getLastBlock().data.height + 1) {
			this.blockchain.resetLastDownloadedBlock();

			return BlockProcessorResult.Rejected;
		}

		this.logger.warning(`Block ${block.data.height.toLocaleString()} (${id}) forcibly accepted.`);

		return this.app.resolve<AcceptBlockHandler>(AcceptBlockHandler).execute(block);
	}
}
