import { Enums, Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import type { Contracts, Utils } from "@mainsail/contracts";

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
			// TODO: ensure validRound points to an existing round?
			const roundState = this.roundStateRepo.getRoundState(state.blockNumber, state.validRound);
			state.validValue = roundState;
		}

		if (state.lockedRound !== undefined) {
			// TODO: ensure lockedRound points to an existing round?
			const roundState = this.roundStateRepo.getRoundState(state.blockNumber, state.lockedRound);
			state.lockedValue = roundState;
		}

		return state;
	}
}
