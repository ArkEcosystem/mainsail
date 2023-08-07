import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { CommittedBlockState } from "./committed-block-state";

@injectable()
export class CommittedBlockProcessor implements Contracts.Consensus.IProcessor {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.BlockProcessor)
	private readonly processor!: Contracts.BlockProcessor.Processor;

	@inject(Identifiers.Cryptography.Block.Factory)
	private readonly blockFactory!: Contracts.Crypto.IBlockFactory;

	async process(data: Buffer): Promise<Contracts.Consensus.ProcessorResult> {
		const committedBlock = await this.#makeCommittedBlock(data);

		if (!committedBlock) {
			return Contracts.Consensus.ProcessorResult.Invalid;
		}

		const committedBlockState = this.app.resolve(CommittedBlockState).configure(committedBlock);

		const result = await this.processor.process(committedBlockState);

		if (result === false) {
			return Contracts.Consensus.ProcessorResult.Invalid;
		}

		committedBlockState.setProcessorResult(result);

		await this.#getConsensus().handleCommittedBlockState(committedBlockState);

		return Contracts.Consensus.ProcessorResult.Accepted;
	}

	async #makeCommittedBlock(data: Buffer): Promise<Contracts.Crypto.ICommittedBlock | undefined> {
		try {
			return await this.blockFactory.fromCommittedBytes(data);
		} catch {
			return undefined;
		}
	}

	#getConsensus(): Contracts.Consensus.IConsensusService {
		return this.app.get<Contracts.Consensus.IConsensusService>(Identifiers.Consensus.Service);
	}
}
