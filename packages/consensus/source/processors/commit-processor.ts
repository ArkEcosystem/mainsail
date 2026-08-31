import type { Contracts } from "@mainsail/contracts";

import { isMajority } from "@mainsail/blockchain-utils";
import { Enums, Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

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
			return Enums.Consensus.ProcessorResult.Skipped;
		}

		const commitState = this.commitStateFactory(commit);

		await this.getConsensus().handleCommitState(commitState);

		if (commitState.getProcessorResult().success) {
			return Enums.Consensus.ProcessorResult.Accepted;
		}

		// A failed result only proves the block is bad while it is still the one being
		// decided. If consensus moved past it meanwhile — committed via live gossip while
		// this unit waited on the handler lock — the failure is stale, not evidence.
		return this.#hasValidBlockNumber(commit)
			? Enums.Consensus.ProcessorResult.Invalid
			: Enums.Consensus.ProcessorResult.Skipped;
	}

	async hasValidSignature(commit: Contracts.Crypto.Commit, previousBlockHash: string): Promise<boolean> {
		const { block, proof } = commit;

		const publicKeys: Buffer[] = [];
		for (const [index, validator] of proof.validators.entries()) {
			if (!validator) {
				continue;
			}

			const validatorPublicKey = this.validatorSet.getValidator(index).blsPublicKey;
			publicKeys.push(Buffer.from(validatorPublicKey, "hex"));
		}

		const { roundValidators } = this.configuration.getMilestone(block.number);
		if (!isMajority(publicKeys.length, roundValidators)) {
			return false;
		}

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

		return this.aggregator.verify(proof, precommit, roundValidators);
	}

	#hasValidBlockNumber(commit: Contracts.Crypto.Commit): boolean {
		return commit.block.number === this.getConsensus().getBlockNumber();
	}
}
