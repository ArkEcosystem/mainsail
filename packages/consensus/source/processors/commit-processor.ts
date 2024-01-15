import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

import { AbstractProcessor } from "./abstract-processor";

@injectable()
export class CommitProcessor extends AbstractProcessor implements Contracts.Consensus.CommitProcessor {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Processor.BlockProcessor)
	private readonly processor!: Contracts.Processor.BlockProcessor;

	@inject(Identifiers.ValidatorSet)
	private readonly validatorSet!: Contracts.ValidatorSet.ValidatorSet;

	@inject(Identifiers.Cryptography.Message.Serializer)
	private readonly serializer!: Contracts.Crypto.MessageSerializer;

	@inject(Identifiers.Consensus.Aggregator)
	private readonly aggregator!: Contracts.Consensus.Aggregator;

	@inject(Identifiers.Consensus.CommitStateFactory)
	private readonly commitStateFactory!: Contracts.Consensus.CommitStateFactory;

	async process(commit: Contracts.Crypto.Commit): Promise<Contracts.Consensus.ProcessorResult> {
		let promise: Promise<void> | undefined;

		const result = await this.commitLock.runNonExclusive(async (): Promise<Contracts.Consensus.ProcessorResult> => {
			if (!this.#hasValidHeight(commit)) {
				return Contracts.Consensus.ProcessorResult.Skipped;
			}

			const commitState = this.commitStateFactory(commit);

			const result = await this.processor.process(commitState);

			if (result === false) {
				return Contracts.Consensus.ProcessorResult.Invalid;
			}

			commitState.setProcessorResult(result);

			promise = this.getConsensus().handleCommitState(commitState);

			return Contracts.Consensus.ProcessorResult.Accepted;
		});

		// Execute outside the lock, to avoid deadlocks.
		// We want to make sure that the block is handled before we return the result to block downloader. This is different from the other processors.
		await promise;
		return result;
	}

	async hasValidSignature(commit: Contracts.Crypto.Commit): Promise<boolean> {
		const { proof, block } = commit;

		const publicKeys: Buffer[] = [];
		for (const [index, validator] of proof.validators.entries()) {
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
			round: proof.round,
			type: Contracts.Crypto.MessageType.Precommit,
		});

		return this.aggregator.verify(proof, precommit, activeValidators);
	}

	#hasValidHeight(commit: Contracts.Crypto.Commit): boolean {
		return commit.block.data.height === this.getConsensus().getHeight();
	}
}
