import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

import { CommittedBlockState } from "../committed-block-state";
import { AbstractProcessor } from "./abstract-processor";

@injectable()
export class CommittedBlockProcessor extends AbstractProcessor {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.BlockProcessor)
	private readonly processor!: Contracts.BlockProcessor.Processor;

	@inject(Identifiers.Cryptography.Block.Factory)
	private readonly blockFactory!: Contracts.Crypto.IBlockFactory;

	@inject(Identifiers.ValidatorSet)
	private readonly validatorSet!: Contracts.ValidatorSet.IValidatorSet;

	@inject(Identifiers.Cryptography.Message.Serializer)
	private readonly serializer!: Contracts.Crypto.IMessageSerializer;

	@inject(Identifiers.Consensus.Aggregator)
	private readonly aggregator!: Contracts.Consensus.IAggregator;

	async process(data: Buffer): Promise<Contracts.Consensus.ProcessorResult> {
		const committedBlock = await this.#makeCommittedBlock(data);

		if (!committedBlock) {
			return Contracts.Consensus.ProcessorResult.Invalid;
		}

		if (!this.#hasValidHeight(committedBlock)) {
			return Contracts.Consensus.ProcessorResult.Skipped;
		}

		if (!(await this.#hasValidCommit(committedBlock))) {
			return Contracts.Consensus.ProcessorResult.Invalid;
		}

		const committedBlockState = this.app.resolve(CommittedBlockState).configure(committedBlock);

		const result = await this.processor.process(committedBlockState);

		if (result === false) {
			return Contracts.Consensus.ProcessorResult.Invalid;
		}

		committedBlockState.setProcessorResult(result);

		void this.getConsensus().handleCommittedBlockState(committedBlockState);

		return Contracts.Consensus.ProcessorResult.Accepted;
	}

	async #makeCommittedBlock(data: Buffer): Promise<Contracts.Crypto.ICommittedBlock | undefined> {
		try {
			return await this.blockFactory.fromCommittedBytes(data);
		} catch {
			return undefined;
		}
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

		if (!Utils.isMajority(publicKeys.length, this.configuration)) {
			return false;
		}

		const precommit = await this.serializer.serializePrecommitForSignature({
			blockId: block.data.id,
			height: block.data.height,
			round: commit.round,
			type: Contracts.Crypto.MessageType.Precommit,
		});

		return this.aggregator.verify(commit, precommit);
	}
}
