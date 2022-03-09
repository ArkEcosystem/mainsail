import { Container, Contracts } from "@arkecosystem/core-kernel";
import { Interfaces } from "@arkecosystem/crypto";

import { BlockHandler, BlockProcessorResult } from "../contracts";

@Container.injectable()
export class IncompatibleTransactionsHandler implements BlockHandler {
	@Container.inject(Container.Identifiers.Application)
	protected readonly app!: Contracts.Kernel.Application;

	@Container.inject(Container.Identifiers.BlockchainService)
	protected readonly blockchain!: Contracts.Blockchain.Blockchain;

	public async execute(block?: Interfaces.IBlock): Promise<BlockProcessorResult> {
		this.blockchain.resetLastDownloadedBlock();

		return BlockProcessorResult.Rejected;
	}
}
