import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

import { AbstractProcessor } from "./abstract-processor";

@injectable()
export class CommittedBlockProcessor extends AbstractProcessor implements Contracts.Consensus.ICommittedBlockProcessor {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.BlockProcessor)
	private readonly processor!: Contracts.BlockProcessor.Processor;

	@inject(Identifiers.ValidatorSet)
	private readonly validatorSet!: Contracts.ValidatorSet.IValidatorSet;

	@inject(Identifiers.Cryptography.Message.Serializer)
	private readonly serializer!: Contracts.Crypto.IMessageSerializer;

	@inject(Identifiers.Consensus.Aggregator)
	private readonly aggregator!: Contracts.Consensus.IAggregator;

	@inject(Identifiers.Consensus.CommittedBlockStateFactory)
	private readonly committedBlockStateFactory!: Contracts.Consensus.ICommittedBlockStateFactory;

	async process(committedBlock: Contracts.Crypto.ICommittedBlock): Promise<Contracts.Consensus.ProcessorResult> {
		return this.commitLock.runNonExclusive(async () => {
			if (!this.#hasValidHeight(committedBlock)) {
				return Contracts.Consensus.ProcessorResult.Skipped;
			}

			if (!(await this.#hasValidCommit(committedBlock))) {
				return Contracts.Consensus.ProcessorResult.Invalid;
			}

			const committedBlockState = this.committedBlockStateFactory(committedBlock);

			const result = await this.processor.process(committedBlockState);

			if (result === false) {
				return Contracts.Consensus.ProcessorResult.Invalid;
			}

			committedBlockState.setProcessorResult(result);

			void this.getConsensus().handleCommittedBlockState(committedBlockState);

			return Contracts.Consensus.ProcessorResult.Accepted;
		});
	}

	#hasValidHeight(committedBlock: Contracts.Crypto.ICommittedBlock): boolean {
		return committedBlock.block.data.height === this.getConsensus().getHeight();
	}

	async #hasValidCommit(committedBlock: Contracts.Crypto.ICommittedBlock): Promise<boolean> {
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
}
