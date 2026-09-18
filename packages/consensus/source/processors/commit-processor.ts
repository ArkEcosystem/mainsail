import type { Contracts } from "@mainsail/contracts";

import { Enums, Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

import { AbstractProcessor } from "./abstract-processor.js";

@injectable()
export class CommitProcessor extends AbstractProcessor implements Contracts.Consensus.CommitProcessor {
	@inject(Identifiers.Cryptography.Message.Serializer)
	private readonly serializer!: Contracts.Crypto.MessageSerializer;

	@inject(Identifiers.Consensus.Aggregator)
	private readonly aggregator!: Contracts.Consensus.Aggregator;

	@inject(Identifiers.Consensus.CommitState.Factory)
	private readonly commitStateFactory!: Contracts.Consensus.CommitStateFactory;

	async process(commit: Contracts.Crypto.Commit): Promise<Contracts.Consensus.ProcessorResult> {
		if (!this.#hasValidBlockNumber(commit)) {
			return Enums.Consensus.ProcessorResult.Skipped;
		}

		const commitState = this.commitStateFactory(commit);

		await this.getConsensus().handleCommitState(commitState);

		// Consensus left the unit alone: it is disposed, or the block was committed meanwhile.
		if (!commitState.hasProcessorResult()) {
			return Enums.Consensus.ProcessorResult.Skipped;
		}

		return commitState.getProcessorResult().success
			? Enums.Consensus.ProcessorResult.Accepted
			: Enums.Consensus.ProcessorResult.Invalid;
	}

	async hasValidSignature(commit: Contracts.Crypto.Commit, previousBlockHash: string): Promise<boolean> {
		const { block, proof } = commit;

		const precommit = await this.serializer.serializeMessageForSignature(
			{
				blockHash: block.hash,
				blockNumber: block.number,
				round: proof.round,
				type: Enums.Crypto.MessageType.Precommit,
			},
			{
				genesisBlockHash: this.stateStore.getGenesisCommit().block.hash,
				previousBlockHash,
			},
		);

		const { roundValidators } = this.configuration.getMilestone(block.number);

		return this.aggregator.verify(proof, precommit, roundValidators);
	}

	#hasValidBlockNumber(commit: Contracts.Crypto.Commit): boolean {
		return commit.block.number === this.getConsensus().getBlockNumber();
	}
}
