import { isMajority } from "@mainsail/blockchain-utils";
import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { AbstractProcessor } from "./abstract-processor.js";

@injectable()
export class CommitProcessor extends AbstractProcessor implements Contracts.Consensus.CommitProcessor {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.ValidatorSet.Service)
	private readonly validatorSet!: Contracts.ValidatorSet.Service;

	@inject(Identifiers.Cryptography.Message.Serializer)
	private readonly serializer!: Contracts.Crypto.MessageSerializer;

	@inject(Identifiers.Consensus.Aggregator)
	private readonly aggregator!: Contracts.Consensus.Aggregator;

	@inject(Identifiers.Consensus.CommitState.Factory)
	private readonly commitStateFactory!: Contracts.Consensus.CommitStateFactory;

	async process(commit: Contracts.Crypto.Commit): Promise<Contracts.Consensus.ProcessorResult> {
		if (!this.#hasValidBlockNumber(commit)) {
			return Contracts.Consensus.ProcessorResult.Skipped;
		}

		const commitState = this.commitStateFactory(commit);

		await this.getConsensus().handleCommitState(commitState);

		return commitState.getProcessorResult().success
			? Contracts.Consensus.ProcessorResult.Accepted
			: Contracts.Consensus.ProcessorResult.Invalid;
	}

	async hasValidSignature(commit: Contracts.Crypto.Commit): Promise<boolean> {
		const { proof, block } = commit;

		const publicKeys: Buffer[] = [];
		for (const [index, validator] of proof.validators.entries()) {
			if (!validator) {
				continue;
			}

			const validatorPublicKey = this.validatorSet.getValidator(index).blsPublicKey;
			publicKeys.push(Buffer.from(validatorPublicKey, "hex"));
		}

		const { activeValidators } = this.configuration.getMilestone(block.header.number);
		if (!isMajority(publicKeys.length, activeValidators)) {
			return false;
		}

		const precommit = await this.serializer.serializePrecommitForSignature({
			blockHash: block.data.hash,
			blockNumber: block.data.number,
			round: proof.round,
			type: Contracts.Crypto.MessageType.Precommit,
		});

		return this.aggregator.verify(proof, precommit, activeValidators);
	}

	#hasValidBlockNumber(commit: Contracts.Crypto.Commit): boolean {
		return commit.block.data.number === this.getConsensus().getBlockNumber();
	}
}
