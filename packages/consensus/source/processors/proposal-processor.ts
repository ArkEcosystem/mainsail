import type { Contracts } from "@mainsail/contracts";

import { Enums, Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";

import { AbstractProcessor } from "./abstract-processor.js";

@injectable()
export class ProposalProcessor extends AbstractProcessor implements Contracts.Consensus.ProposalProcessor {
	@inject(Identifiers.Cryptography.Proposal.Serializer)
	private readonly proposalSerializer!: Contracts.Crypto.ProposalSerializer;

	@inject(Identifiers.Cryptography.Message.Serializer)
	private readonly messageSerializer!: Contracts.Crypto.MessageSerializer;

	@inject(Identifiers.Cryptography.Signature.Instance)
	@tagged("type", "consensus")
	private readonly consensusSignature!: Contracts.Crypto.SignatureBls;

	@inject(Identifiers.Consensus.Aggregator)
	private readonly aggregator!: Contracts.Consensus.Aggregator;

	@inject(Identifiers.BlockchainUtils.ProposerCalculator)
	private readonly proposerCalculator!: Contracts.BlockchainUtils.ProposerCalculator;

	@inject(Identifiers.ValidatorSet.Service)
	private readonly validatorSet!: Contracts.ValidatorSet.Service;

	@inject(Identifiers.Consensus.RoundStateRepository)
	private readonly roundStateRepo!: Contracts.Consensus.RoundStateRepository;

	@inject(Identifiers.P2P.Broadcaster)
	private readonly broadcaster!: Contracts.P2P.Broadcaster;

	async process(
		proposal: Contracts.Crypto.Proposal,
		broadcast: boolean = true,
	): Promise<Contracts.Consensus.ProcessorResult> {
		return this.commitLock.runNonExclusive(async () => {
			if (this.isConsensusDisposed()) {
				return Enums.Consensus.ProcessorResult.Skipped;
			}

			if (
				!this.hasValidBlockNumberAndRound({ blockNumber: proposal.blockHeader.number, round: proposal.round })
			) {
				return Enums.Consensus.ProcessorResult.Skipped;
			}

			if (this.isRoundAheadOfTime(proposal)) {
				return Enums.Consensus.ProcessorResult.Skipped;
			}

			if (!this.#hasValidProposer(proposal)) {
				return Enums.Consensus.ProcessorResult.Invalid;
			}

			if (!(await this.#hasValidSignature(proposal))) {
				return Enums.Consensus.ProcessorResult.Invalid;
			}

			const roundState = this.roundStateRepo.getRoundState(proposal.blockHeader.number, proposal.round);
			if (roundState.hasProposal()) {
				return Enums.Consensus.ProcessorResult.Skipped;
			}

			roundState.addProposal(proposal);

			if (broadcast) {
				void this.broadcaster.broadcastProposal(proposal);
			}

			// Add some time to allow the proposal to be broadcast to other nodes before processing it.
			setTimeout(() => {
				this.handleRoundState(roundState);
			}, 0);

			return Enums.Consensus.ProcessorResult.Accepted;
		});
	}

	async hasValidLockProof(proposal: Contracts.Crypto.Proposal): Promise<boolean> {
		if (proposal.validRound === undefined && proposal.lockProof === undefined) {
			return true;
		}

		// A re-proposal carries both: validRound names the round its value was found valid in, and lockProof
		// holds the +2/3 prevotes of that round. One without the other is malformed. The proposal factory
		// rejects such bytes already; this keeps the check self-contained.
		if (proposal.lockProof === undefined) {
			this.logger.debug(
				`Received proposal ${proposal.blockHeader.number}/${proposal.round} has validRound ${proposal.validRound} but no lock proof`,
				"consensus",
			);

			return false;
		}

		if (proposal.validRound === undefined) {
			this.logger.debug(
				`Received proposal ${proposal.blockHeader.number}/${proposal.round} has a lock proof but no validRound`,
				"consensus",
			);

			return false;
		}

		if (proposal.validRound >= proposal.round) {
			this.logger.debug(
				`Received proposal ${proposal.blockHeader.number}/${proposal.round} has validRound ${proposal.validRound} >= round ${proposal.round}`,
				"consensus",
			);

			return false;
		}

		const data = await this.messageSerializer.serializeMessageForSignature(
			{
				blockHash: proposal.blockHeader.hash,
				blockNumber: proposal.blockHeader.number,
				round: proposal.validRound,
				type: Enums.Crypto.MessageType.Prevote,
			},
			{
				genesisBlockHash: this.stateStore.getGenesisCommit().block.hash,
				previousBlockHash: this.stateStore.getLastBlock().hash,
			},
		);

		const { roundValidators } = this.configuration.getMilestone(proposal.blockHeader.number);
		const verified = await this.aggregator.verify(proposal.lockProof, data, roundValidators);

		if (!verified) {
			this.logger.debug(
				`Received proposal ${proposal.blockHeader.number}/${proposal.round} with invalid lock proof`,
				"consensus",
			);
		}

		return verified;
	}

	#hasValidProposer(proposal: Contracts.Crypto.Proposal): boolean {
		return proposal.validatorIndex === this.proposerCalculator.getValidatorIndex(proposal.round);
	}

	async #hasValidSignature(proposal: Contracts.Crypto.Proposal): Promise<boolean> {
		return this.consensusSignature.verify(
			Buffer.from(proposal.signature, "hex"),
			await this.proposalSerializer.serializeProposalUnsigned(proposal.toSerializableData()),
			Buffer.from(this.validatorSet.getValidator(proposal.validatorIndex).blsPublicKey, "hex"),
		);
	}
}
