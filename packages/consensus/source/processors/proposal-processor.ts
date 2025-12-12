import { Enums, Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";

import { AbstractProcessor } from "./abstract-processor.js";

@injectable()
export class ProposalProcessor extends AbstractProcessor implements Contracts.Consensus.ProposalProcessor {
	@inject(Identifiers.Cryptography.Proposal.Serializer)
	private readonly proposalSerializer!: Contracts.Crypto.ProposalSerializer;

	@inject(Identifiers.Cryptography.Message.Serializer)
	private readonly messageSerializer!: Contracts.Crypto.MessageSerializer;

	@inject(Identifiers.Cryptography.Signature.Instance)
	@tagged("type", "consensus")
	private readonly consensusSignature!: Contracts.Crypto.Signature;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

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

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	async process(proposal: Contracts.Crypto.Proposal, broadcast = true): Promise<Contracts.Consensus.ProcessorResult> {
		return this.commitLock.runNonExclusive(async () => {
			if (!this.hasValidBlockNumberOrRound({ blockNumber: proposal.blockHeader.number, round: proposal.round })) {
				return Enums.Consensus.ProcessorResult.Skipped;
			}

			if (!this.isRoundInBounds(proposal)) {
				return Enums.Consensus.ProcessorResult.Invalid;
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

			// Add some time to allow the proposal to be broadcasted to other nodes before processing it.
			setTimeout(() => {
				void this.getConsensus().handle(roundState);
			}, 0);

			return Enums.Consensus.ProcessorResult.Accepted;
		});
	}

	async hasValidLockProof(proposal: Contracts.Crypto.Proposal): Promise<boolean> {
		if (proposal.validRound === undefined) {
			return true;
		}

		if (proposal.validRound >= proposal.round) {
			this.logger.debug(
				`Received proposal ${proposal.blockHeader.number}/${proposal.round} has validRound ${proposal.validRound} >= round ${proposal.round}`,
				"consensus",
			);

			return false;
		}

		if (!proposal.lockProof) {
			this.logger.debug(
				`Received proposal ${proposal.blockHeader.number}/${proposal.round} with missing lock proof`,
				"consensus",
			);
			return true;
		}

		const data = await this.messageSerializer.serializePrevoteForSignature({
			blockHash: proposal.blockHeader.hash,
			blockNumber: proposal.blockHeader.number,
			round: proposal.validRound,
			type: Enums.Crypto.MessageType.Prevote,
		});

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
			await this.proposalSerializer.serializeProposal(proposal.toSerializableData(), { includeSignature: false }),
			Buffer.from(this.validatorSet.getValidator(proposal.validatorIndex).blsPublicKey, "hex"),
		);
	}
}
