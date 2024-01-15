import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { IpcWorker } from "@mainsail/kernel";

import { AbstractProcessor } from "./abstract-processor";

@injectable()
export class ProposalProcessor extends AbstractProcessor implements Contracts.Consensus.ProposalProcessor {
	@inject(Identifiers.Cryptography.Message.Serializer)
	private readonly messageSerializer!: Contracts.Crypto.MessageSerializer;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Consensus.Aggregator)
	private readonly aggregator!: Contracts.Consensus.Aggregator;

	@inject(Identifiers.Proposer.Selector)
	private readonly proposerSelector!: Contracts.Proposer.ProposerSelector;

	@inject(Identifiers.ValidatorSet.Service)
	private readonly validatorSet!: Contracts.ValidatorSet.Service;

	@inject(Identifiers.Consensus.RoundStateRepository)
	private readonly roundStateRepo!: Contracts.Consensus.RoundStateRepository;

	@inject(Identifiers.PeerBroadcaster)
	private readonly broadcaster!: Contracts.P2P.Broadcaster;

	@inject(Identifiers.Kernel.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.CryptoWorker.WorkerPool)
	private readonly workerPool!: IpcWorker.WorkerPool;

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

			if (!this.#hasValidBlockGenerator(proposal)) {
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
		const worker = await this.workerPool.getWorker();
		return worker.consensusSignature(
			"verify",
			Buffer.from(proposal.signature, "hex"),
			await this.messageSerializer.serializeProposal(proposal, { includeSignature: false }),
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

		const lockProof = proposal.block.lockProof;
		if (!lockProof) {
			this.logger.debug(`Received proposal ${proposal.height}/${proposal.round} with missing lock proof`);
			return true;
		}

		const data = await this.messageSerializer.serializePrevoteForSignature({
			blockId: proposal.block.block.header.id,
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

	#hasValidBlockGenerator(proposal: Contracts.Crypto.Proposal): boolean {
		if (proposal.validRound !== undefined) {
			// We assume that this check passed when block was proposed first time, so we don't need to check it again.
			// The check also cannot be repeated because we don't hold the value when the block was proposed first time.
			return true;
		}

		const proposer = this.validatorSet.getValidator(this.proposerSelector.getValidatorIndex(proposal.round));
		const isValid = proposal.block.block.data.generatorPublicKey === proposer.getWalletPublicKey();

		if (!isValid) {
			this.logger.debug(`Received proposal ${proposal.height}/${proposal.round} with invalid block generator`);
		}

		return isValid;
	}
}
