import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

import { AbstractProcessor } from "./abstract-processor";

@injectable()
export class CommittedBlockProcessor extends AbstractProcessor implements Contracts.Consensus.CommittedBlockProcessor {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.BlockProcessor)
	private readonly processor!: Contracts.Processor.BlockProcessor;

	@inject(Identifiers.ValidatorSet)
	private readonly validatorSet!: Contracts.ValidatorSet.ValidatorSet;

	@inject(Identifiers.Cryptography.Message.Serializer)
	private readonly serializer!: Contracts.Crypto.MessageSerializer;

	@inject(Identifiers.Consensus.Aggregator)
	private readonly aggregator!: Contracts.Consensus.Aggregator;

	@inject(Identifiers.Consensus.CommittedBlockStateFactory)
	private readonly committedBlockStateFactory!: Contracts.Consensus.CommittedBlockStateFactory;

	async process(committedBlock: Contracts.Crypto.CommittedBlock): Promise<Contracts.Consensus.ProcessorResult> {
		let promise: Promise<void> | undefined;

		const result = await this.commitLock.runNonExclusive(async (): Promise<Contracts.Consensus.ProcessorResult> => {
			if (!this.#hasValidHeight(committedBlock)) {
				return Contracts.Consensus.ProcessorResult.Skipped;
			}

			const committedBlockState = this.committedBlockStateFactory(committedBlock);

			const result = await this.processor.process(committedBlockState);

			if (result === false) {
				return Contracts.Consensus.ProcessorResult.Invalid;
			}

			committedBlockState.setProcessorResult(result);

			promise = this.getConsensus().handleCommittedBlockState(committedBlockState);

			return Contracts.Consensus.ProcessorResult.Accepted;
		});

		// Execute outside the lock, to avoid deadlocks.
		// We want to make sure that the block is handled before we return the result to block downloader. This is different from the other processors.
		await promise;
		return result;
	}

	async hasValidSignature(committedBlock: Contracts.Crypto.CommittedBlock): Promise<boolean> {
		const { commit, block } = committedBlock;

		const publicKeys: Buffer[] = [];
		for (const [index, validator] of commit.validators.entries()) {
			if (!validator) {
				continue;
			}

			const validatorPublicKey = this.validatorSet.getValidator(index).getConsensusPublicKey();
			publicKeys.push(Buffer.from(validatorPublicKey, "hex"));
		}

		const { activeValidators } = this.configuration.getMilestone(block.header.height);
		if (!Utils.isMajority(publicKeys.length, activeValidators)) {
			return false;
		}

		const precommit = await this.serializer.serializePrecommitForSignature({
			blockId: block.data.id,
			height: block.data.height,
			round: commit.round,
			type: Contracts.Crypto.MessageType.Precommit,
		});

		return this.aggregator.verify(commit, precommit, activeValidators);
	}

	#hasValidHeight(committedBlock: Contracts.Crypto.CommittedBlock): boolean {
		return committedBlock.block.data.height === this.getConsensus().getHeight();
	}
}
