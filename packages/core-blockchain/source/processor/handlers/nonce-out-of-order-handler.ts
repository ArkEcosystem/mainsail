import Contracts, { Crypto, Identifiers } from "@arkecosystem/core-contracts";
import { Container } from "@arkecosystem/core-kernel";

import { BlockProcessorResult } from "../block-processor";
import { BlockHandler } from "../contracts";

@Container.injectable()
export class NonceOutOfOrderHandler implements BlockHandler {
	@Container.inject(Identifiers.Application)
	protected readonly app!: Contracts.Kernel.Application;

	@Container.inject(Identifiers.BlockchainService)
	protected readonly blockchain!: Contracts.Blockchain.Blockchain;

	public async execute(block?: Crypto.IBlock): Promise<BlockProcessorResult> {
		this.blockchain.resetLastDownloadedBlock();

		return BlockProcessorResult.Rejected;
	}
}
