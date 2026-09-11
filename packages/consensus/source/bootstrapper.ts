import type { Contracts, Utils } from "@mainsail/contracts";

import { Enums, Identifiers, Locale } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

@injectable()
export class Bootstrapper implements Contracts.Consensus.Bootstrapper {
	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Consensus.RoundStateRepository)
	private readonly roundStateRepo!: Contracts.Consensus.RoundStateRepository;

	@inject(Identifiers.ConsensusStorage.Service)
	private readonly storage!: Contracts.ConsensusStorage.Service;

	@inject(Identifiers.State.Store)
	private readonly stateStore!: Contracts.State.Store;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	public async loadRounds(): Promise<void> {
		const proposals = await this.storage.getProposals();

		this.logger.info(`Consensus Bootstrap - Proposals: ${proposals.length}`, "consensus");

		for (const proposal of proposals) {
			this.roundStateRepo.getRoundState(proposal.blockHeader.number, proposal.round).addProposal(proposal);
		}

		const messages = await this.storage.getMessages();

		const prevotes = messages.filter((message) => message.type === Enums.Crypto.MessageType.Prevote);
		const precommits = messages.filter((message) => message.type === Enums.Crypto.MessageType.Precommit);

		this.logger.info(
			`Consensus Bootstrap - Prevotes: ${prevotes.length}, Precommits: ${precommits.length}`,
			"consensus",
		);

		for (const message of messages) {
			this.roundStateRepo.getRoundState(message.blockNumber, message.round).addMessage(message);
		}
	}

	// The state consensus starts from: the stored one when it belongs to the next block, otherwise the start of
	// round 0, in which case the loaded round states go as well.
	public async getConsensusState(): Promise<Contracts.Consensus.State> {
		const blockNumber = this.stateStore.getLastBlock().number + 1;

		if (blockNumber !== this.configuration.getHeight()) {
			throw new Error(
				`bootstrapped block number ${blockNumber} does not match configuration block number ${this.configuration.getHeight()}`,
			);
		}

		const stored = await this.storage.getState();

		if (stored === undefined || stored.blockNumber !== blockNumber) {
			if (stored !== undefined) {
				const storedBlockNumber = stored.blockNumber.toLocaleString(Locale);
				const currentBlockNumber = blockNumber.toLocaleString(Locale);

				this.logger.warn(
					`Skipping state restore, because stored block number is ${storedBlockNumber}, but should be ${currentBlockNumber}`,
					"consensus",
				);
			}

			this.roundStateRepo.clear();

			return this.#completed({ blockNumber, round: 0, step: Enums.Consensus.Step.Propose });
		}

		const state = { ...stored } as Utils.Mutable<Contracts.Consensus.State>;

		if (state.validRound !== undefined) {
			const roundState = this.roundStateRepo.getRoundState(state.blockNumber, state.validRound);
			const proposal = roundState.getProposal();

			// The valid value gets re-proposed, which needs its proposal. State and proposals are stored in one
			// transaction, so a missing proposal means the store was tampered with; propose a fresh block instead.
			if (proposal) {
				await proposal.deserializePayload();
				state.validValue = roundState;
			} else {
				this.logger.warn(
					`Consensus Bootstrap - Dropping valid round ${state.blockNumber}/${state.validRound}, because its proposal is not stored`,
					"consensus",
				);
				state.validRound = undefined;
			}
		}

		if (state.lockedRound !== undefined) {
			// Only the round number of the locked value is consumed, so the round state needs no proposal. The lock
			// is kept even when the valid value above was dropped, because forgetting it would weaken safety.
			state.lockedValue = this.roundStateRepo.getRoundState(state.blockNumber, state.lockedRound);
		}

		return this.#completed(state);
	}

	#completed(state: Contracts.Consensus.State): Contracts.Consensus.State {
		const blockNumber = state.blockNumber.toLocaleString(Locale);
		const round = state.round.toLocaleString(Locale);

		this.logger.info(
			`Completed consensus bootstrap for ${blockNumber}/${round} with total round ${this.stateStore.getTotalRound()}`,
			"consensus",
		);

		return state;
	}
}
