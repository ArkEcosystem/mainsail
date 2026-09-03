import type { Contracts, Utils } from "@mainsail/contracts";

import { Enums, Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

@injectable()
export class Bootstrapper implements Contracts.Consensus.Bootstrapper {
	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Consensus.RoundStateRepository)
	private readonly roundStateRepo!: Contracts.Consensus.RoundStateRepository;

	@inject(Identifiers.ConsensusStorage.Service)
	private readonly storage!: Contracts.ConsensusStorage.Service;

	public async run(): Promise<Contracts.Consensus.State | undefined> {
		const proposals = await this.storage.getProposals();

		this.logger.info(`Consensus Bootstrap - Proposals: ${proposals.length}`, "consensus");

		for (const proposal of proposals) {
			const roundState = this.roundStateRepo.getRoundState(proposal.blockHeader.number, proposal.round);
			roundState.addProposal(proposal);
		}

		const messages = await this.storage.getMessages();

		const prevotes = messages.filter((message) => message.type === Enums.Crypto.MessageType.Prevote);
		const precommits = messages.filter((message) => message.type === Enums.Crypto.MessageType.Precommit);

		this.logger.info(
			`Consensus Bootstrap - Prevotes: ${prevotes.length}, Precommits: ${precommits.length}`,
			"consensus",
		);
		for (const message of messages) {
			const roundState = this.roundStateRepo.getRoundState(message.blockNumber, message.round);
			roundState.addMessage(message);
		}

		const state = (await this.storage.getState()) as Utils.Mutable<Contracts.Consensus.State> | undefined;
		if (!state) {
			return undefined;
		}

		if (state.validRound !== undefined) {
			const roundState = this.roundStateRepo.getRoundState(state.blockNumber, state.validRound);

			// The valid value gets re-proposed, which needs its proposal. State and proposals are stored in one
			// transaction, so a missing proposal means the store was tampered with; propose a fresh block instead.
			if (roundState.hasProposal()) {
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

		return state;
	}
}
