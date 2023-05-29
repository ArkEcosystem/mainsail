import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { RoundState } from "./round-state";
import { RoundStateRepository } from "./round-state-repository";
import { IHandler } from "./types";

@injectable()
export class Handler implements IHandler {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.LogService)
	private readonly logger: Contracts.Kernel.Logger;

	@inject(Identifiers.Consensus.RoundStateRepository)
	private readonly roundStateRepo!: RoundStateRepository;

	@inject(Identifiers.Cryptography.Message.Verifier)
	private readonly verifier!: Contracts.Crypto.IMessageVerifier;

	async onProposal(proposal: Contracts.Crypto.IProposal): Promise<void> {
		// TODO: Move verification to p2p handler
		const { errors } = await this.verifier.verifyProposal(proposal);
		if (errors.length > 0) {
			this.logger.warning(`received invalid proposal: ${proposal.toString()} errors: ${JSON.stringify(errors)}`);
			return;
		}

		const roundState = this.roundStateRepo.getRoundState(proposal.height, proposal.round);
		roundState.setProposal(proposal);

		await this.#getConsensus().onProposal(roundState);
	}

	async onPrevote(prevote: Contracts.Crypto.IPrevote): Promise<void> {
		// TODO: Move verification to p2p handler
		const { errors } = await this.verifier.verifyPrevote(prevote);
		if (errors.length > 0) {
			this.logger.warning(`received invalid prevote: ${prevote.toString()} errors: ${JSON.stringify(errors)}`);
			return;
		}

		const roundState = this.roundStateRepo.getRoundState(prevote.height, prevote.round);

		roundState.addPrevote(prevote);

		await this.#handle(roundState);
	}

	async onPrecommit(precommit: Contracts.Crypto.IPrecommit): Promise<void> {
		// TODO: Move verification to p2p handler
		const { errors } = await this.verifier.verifyPrecommit(precommit);
		if (errors.length > 0) {
			this.logger.warning(
				`received invalid precommit: ${precommit.toString()} errors: ${JSON.stringify(errors)}`,
			);
			return;
		}

		const roundState = this.roundStateRepo.getRoundState(precommit.height, precommit.round);

		roundState.addPrecommit(precommit);

		await this.#handle(roundState);
	}

	async #handle(roundState: RoundState): Promise<void> {
		const proposal = roundState.getProposal();

		if (!proposal) {
			return;
		}

		const consensus = this.#getConsensus();

		if (roundState.hasMajorityPrevotes()) {
			await consensus.onMajorityPrevote(roundState);
		}

		if (roundState.hasMajorityPrecommits()) {
			await consensus.onMajorityPrecommit(roundState);
		}
	}

	#getConsensus(): Contracts.Consensus.IConsensusService {
		return this.app.get<Contracts.Consensus.IConsensusService>(Identifiers.Consensus.Service);
	}
}
