import type { Contracts } from "@mainsail/contracts";

import { Events, Identifiers, Locale } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

type OwnRound = { address: string; round: number };

// Reports, for the validators this node runs, the proposals it submits and whether the block committed at a block
// number is theirs or one they missed. It follows consensus through its events and holds nothing of it.
@injectable()
export class ProposerReporter implements Contracts.Validator.ProposerReporter {
	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Validator.Repository)
	private readonly validatorsRepository!: Contracts.Validator.ValidatorRepository;

	@inject(Identifiers.ValidatorSet.Service)
	private readonly validatorSet!: Contracts.ValidatorSet.Service;

	@inject(Identifiers.BlockchainUtils.ProposerCalculator)
	private readonly proposerCalculator!: Contracts.BlockchainUtils.ProposerCalculator;

	// The rounds of a block number in which one of this node's validators was the proposer. Keyed by block number
	// because the commit of one block number and the first round of the next arrive as separate events, and a
	// listener has no say in which of them it handles first.
	readonly #ownRounds = new Map<number, OwnRound[]>();

	public boot(): void {
		this.events.listenMany(this.#subscriptions());
	}

	public dispose(): void {
		this.events.forgetMany(this.#subscriptions());
	}

	public async handle({ data, name }: { name: string; data: unknown }): Promise<void> {
		switch (name) {
			case Events.ConsensusEvent.RoundStarted: {
				this.#onRoundStarted(data as Contracts.Consensus.StateData);
				break;
			}
			case Events.ConsensusEvent.Proposed: {
				this.#onProposed(data as Contracts.Crypto.Proposal);
				break;
			}
			case Events.BlockEvent.Applied: {
				this.#onBlockApplied(data as Contracts.Crypto.BlockData);
				break;
			}
		}
	}

	#subscriptions(): Array<[string, Contracts.Kernel.EventListener]> {
		return [
			[Events.ConsensusEvent.RoundStarted, this],
			[Events.ConsensusEvent.Proposed, this],
			[Events.BlockEvent.Applied, this],
		];
	}

	#onRoundStarted({ blockNumber, round }: Contracts.Consensus.StateData): void {
		const proposer = this.validatorSet.getRoundValidators()[this.proposerCalculator.getValidatorIndex(round)];

		if (proposer === undefined || this.validatorsRepository.getValidator(proposer.blsPublicKey) === undefined) {
			return;
		}

		const ownRounds = this.#ownRounds.get(blockNumber) ?? [];
		if (ownRounds.some((ownRound) => ownRound.round === round)) {
			return;
		}

		ownRounds.push({ address: proposer.address, round });
		this.#ownRounds.set(blockNumber, ownRounds);
	}

	#onProposed(proposal: Contracts.Crypto.Proposal): void {
		const { blockHeader, round, validRound } = proposal;

		const ownRound = this.#ownRounds.get(blockHeader.number)?.find((ownRound) => ownRound.round === round);
		const submission = `${this.#blockString(blockHeader, round)} as ${ownRound?.address ?? blockHeader.proposer}`;

		if (validRound === undefined) {
			this.logger.notice(`📦 Proposing block ${submission}`, "consensus");
			return;
		}

		this.logger.notice(`📦 Re-proposing block ${submission}, forged by ${blockHeader.proposer}`, "consensus");
	}

	#onBlockApplied(block: Contracts.Crypto.BlockData): void {
		const ownRounds = this.#ownRounds.get(block.number);

		// The committed block settles its block number and every earlier one.
		for (const blockNumber of this.#ownRounds.keys()) {
			if (blockNumber <= block.number) {
				this.#ownRounds.delete(blockNumber);
			}
		}

		if (ownRounds === undefined) {
			return;
		}

		// Whichever of our rounds it came from, and whoever ended up proposing it: the block is ours.
		if (ownRounds.some((ownRound) => ownRound.address === block.proposer)) {
			this.logger.notice(
				`✅ Committed our block ${this.#position(block.number, block.round)} as ${block.proposer}`,
				"consensus",
			);
			return;
		}

		for (const ownRound of ownRounds) {
			this.logger.notice(
				`❌ Missed our round ${this.#position(block.number, ownRound.round)} as ${ownRound.address}, committed by ${block.proposer}`,
				"consensus",
			);
		}
	}

	#blockString(block: Contracts.Crypto.BlockHeader, round: number): string {
		const position = this.#position(block.number, round);

		if (block.round !== round) {
			return `${position}(${block.round.toLocaleString(Locale)})/${block.hash}`;
		}

		return `${position}/${block.hash}`;
	}

	#position(blockNumber: number, round: number): string {
		return `${blockNumber.toLocaleString(Locale)}/${round.toLocaleString(Locale)}`;
	}
}
