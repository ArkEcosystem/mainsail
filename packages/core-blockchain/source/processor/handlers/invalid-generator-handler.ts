import { inject, injectable } from "@arkecosystem/core-container";
import Contracts, { Crypto, Identifiers } from "@arkecosystem/core-contracts";

import { BlockProcessorResult } from "../block-processor";
import { BlockHandler } from "../contracts";

@injectable()
export class InvalidGeneratorHandler implements BlockHandler {
	@inject(Identifiers.Application)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.BlockchainService)
	protected readonly blockchain!: Contracts.Blockchain.Blockchain;

	public async execute(block?: Crypto.IBlock): Promise<BlockProcessorResult> {
		this.blockchain.resetLastDownloadedBlock();

		return BlockProcessorResult.Rejected;
	}
}
