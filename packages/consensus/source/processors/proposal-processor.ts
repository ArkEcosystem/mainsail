import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { AbstractProcessor } from "./abstract-processor.js";

@injectable()
export class ProposalProcessor extends AbstractProcessor implements Contracts.Consensus.ProposalProcessor {
	@inject(Identifiers.Cryptography.Message.Serializer)
	private readonly messageSerializer!: Contracts.Crypto.MessageSerializer;

	@inject(Identifiers.Cryptography.Signature.Instance)
	@tagged("type", "consensus")
	private readonly consensusSignature!: Contracts.Crypto.Signature;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Consensus.Aggregator)
	private readonly aggregator!: Contracts.Consensus.Aggregator;

	@inject(Identifiers.Proposer.Selector)
	private readonly proposerSelector!: Contracts.Proposer.Selector;

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
			if (!this.hasValidHeightOrRound(proposal)) {
				return Contracts.Consensus.ProcessorResult.Skipped;
			}

			if (!this.isRoundInBounds(proposal)) {
				return Contracts.Consensus.ProcessorResult.Invalid;
			}

			if (!this.#hasValidProposer(proposal)) {
				return Contracts.Consensus.ProcessorResult.Invalid;
			}

			if (!(await this.#hasValidSignature(proposal))) {
				return Contracts.Consensus.ProcessorResult.Invalid;
			}

			if (!(await this.#hasValidLockProof(proposal))) {
				return Contracts.Consensus.ProcessorResult.Invalid;
			}

			const roundState = this.roundStateRepo.getRoundState(proposal.height, proposal.round);
			if (roundState.hasProposal()) {
				return Contracts.Consensus.ProcessorResult.Skipped;
			}

			roundState.addProposal(proposal);

			if (broadcast) {
				void this.broadcaster.broadcastProposal(proposal);
			}

			void this.getConsensus().handle(roundState);

			return Contracts.Consensus.ProcessorResult.Accepted;
		});
	}

	#hasValidProposer(proposal: Contracts.Crypto.Proposal): boolean {
		return proposal.validatorIndex === this.proposerSelector.getValidatorIndex(proposal.round);
	}

	async #hasValidSignature(proposal: Contracts.Crypto.Proposal): Promise<boolean> {
		return this.consensusSignature.verify(
			Buffer.from(proposal.signature, "hex"),
			await this.messageSerializer.serializeProposal(proposal.toSerializableData(), { includeSignature: false }),
			Buffer.from(this.validatorSet.getValidator(proposal.validatorIndex).getConsensusPublicKey(), "hex"),
		);
	}

	async #hasValidLockProof(proposal: Contracts.Crypto.Proposal): Promise<boolean> {
		if (proposal.validRound === undefined) {
			return true;
		}

		if (proposal.validRound >= proposal.round) {
			this.logger.debug(
				`Received proposal ${proposal.height}/${proposal.round} has validRound ${proposal.validRound} >= round ${proposal.round}`,
			);

			return false;
		}

		const lockProof = proposal.getData().lockProof;
		if (!lockProof) {
			this.logger.debug(`Received proposal ${proposal.height}/${proposal.round} with missing lock proof`);
			return true;
		}

		const data = await this.messageSerializer.serializePrevoteForSignature({
			blockId: proposal.getData().block.header.id,
			height: proposal.height,
			round: proposal.validRound,
			type: Contracts.Crypto.MessageType.Prevote,
		});

		const { activeValidators } = this.configuration.getMilestone(proposal.height);
		const verified = await this.aggregator.verify(lockProof, data, activeValidators);

		if (!verified) {
			this.logger.debug(`Received proposal ${proposal.height}/${proposal.round} with invalid lock proof`);
		}

		return verified;
	}
}
