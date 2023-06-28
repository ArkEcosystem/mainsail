import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import seedrandom from "seedrandom";

@injectable()
export class ProposerPicker implements Contracts.Consensus.IProposerPicker {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.Database.Service)
	private readonly databaseService!: Contracts.Database.IDatabaseService;

	@inject(Identifiers.StateStore)
	private readonly state!: Contracts.State.StateStore;

	public async getValidatorIndex(height: number, round: number): Promise<number> {
		const seed = await this.#calculateSeed(height, round);

		const { activeValidators } = this.configuration.getMilestone(height);
		const rng = seedrandom(seed);
		return Math.floor(rng() * (activeValidators - 1));
	}

	async #calculateSeed(height: number, round: number): Promise<string> {
		const totalRound = await this.#getTotalRound(height, round);

		// TODO: take block id into account

		return `${totalRound}`;
	}

	async #getTotalRound(height: number, round: number): Promise<number> {
		const committedRound = await this.#getCommittedRound(height);
		return committedRound + round + 1;
	}

	async #getCommittedRound(height: number): Promise<number> {
		const lastHeight = this.state.getLastHeight();
		if (lastHeight === height) {
			return this.state.getLastCommittedRound();
		}

		if (lastHeight < height) {
			return this.databaseService.getCommittedRound(lastHeight);
		}

		return this.databaseService.getCommittedRound(height);
	}
}
