import type { Contracts } from "@mainsail/contracts";

import { Events, Identifiers, Locale } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

type OwnSlot = { address: string; round: number };

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
	readonly #ownSlots = new Map<number, OwnSlot[]>();

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
		// The same derivation consensus uses for its round state, so the two agree on who proposes.
		const proposer = this.validatorSet.getRoundValidators()[this.proposerCalculator.getValidatorIndex(round)];

		if (proposer === undefined || this.validatorsRepository.getValidator(proposer.blsPublicKey) === undefined) {
			return;
		}

		const ownSlots = this.#ownSlots.get(blockNumber) ?? [];
		if (ownSlots.some((slot) => slot.round === round)) {
			return;
		}

		ownSlots.push({ address: proposer.address, round });
		this.#ownSlots.set(blockNumber, ownSlots);
	}

	#onProposed(proposal: Contracts.Crypto.Proposal): void {
		const { blockHeader, round } = proposal;

		// A re-proposed block keeps the proposer that forged it, so the slot names the validator proposing here.
		const ownSlot = this.#ownSlots.get(blockHeader.number)?.find((slot) => slot.round === round);

		this.logger.notice(
			`📦 Proposing block ${this.#blockString(blockHeader, round)} as ${ownSlot?.address ?? blockHeader.proposer}`,
			"consensus",
		);
	}

	#onBlockApplied(block: Contracts.Crypto.BlockData): void {
		const ownSlots = this.#ownSlots.get(block.number);

		// The committed block settles its block number and every earlier one.
		for (const blockNumber of this.#ownSlots.keys()) {
			if (blockNumber <= block.number) {
				this.#ownSlots.delete(blockNumber);
			}
		}

		if (ownSlots === undefined) {
			return;
		}

		// Whichever of our rounds it came from, and whoever ended up proposing it: the block is ours.
		if (ownSlots.some((slot) => slot.address === block.proposer)) {
			this.logger.notice(
				`✅ Committed our block ${this.#position(block.number, block.round)} as ${block.proposer}`,
				"consensus",
			);
			return;
		}

		for (const slot of ownSlots) {
			this.logger.notice(
				`❌ Missed our slot ${this.#position(block.number, slot.round)} as ${slot.address}, committed by ${block.proposer}`,
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
