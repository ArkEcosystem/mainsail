import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Storage } from "./storage";
import { RoundStateRepository } from "./round-state-repository";

@injectable()
export class Bootstrapper {
	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Consensus.RoundStateRepository)
	private readonly roundStateRepo!: RoundStateRepository;

	@inject(Identifiers.Consensus.Storage)
	private readonly storage!: Storage;

	public async run(): Promise<Contracts.Consensus.IConsensusState | undefined> {
		const proposals = await this.storage.getProposals();

		this.logger.info(`Consensus Bootstrap - Proposals: ${proposals.length}`);
		for (const proposal of proposals) {
			const roundState = await this.roundStateRepo.getRoundState(proposal.height, proposal.round);
			await roundState.addProposal(proposal);
		}

		const prevotes = await this.storage.getPrevotes();

		this.logger.info(`Consensus Bootstrap - Prevotes: ${prevotes.length}`);
		for (const prevote of prevotes) {
			const roundState = await this.roundStateRepo.getRoundState(prevote.height, prevote.round);
			await roundState.addPrevote(prevote);
		}

		const precommits = await this.storage.getPrecommits();

		this.logger.info(`Consensus Bootstrap - Precommits: ${precommits.length}`);
		for (const precommit of precommits) {
			const roundState = await this.roundStateRepo.getRoundState(precommit.height, precommit.round);
			await roundState.addPrecommit(precommit);
		}

		return this.storage.getState();
	}

}
