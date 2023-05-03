import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/core-contracts";

import { BlockHandler, BlockProcessorResult } from "../contracts";

@injectable()
export class AlreadyForgedHandler implements BlockHandler {
	@inject(Identifiers.Application)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.BlockchainService)
	protected readonly blockchain!: Contracts.Blockchain.Blockchain;

	public async execute(block?: Contracts.Crypto.IBlock): Promise<BlockProcessorResult> {
		this.blockchain.resetLastDownloadedBlock();

		return BlockProcessorResult.DiscardedButCanBeBroadcasted;
	}
}
