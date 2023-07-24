import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import seedrandom from "seedrandom";

@injectable()
export class ProposerPicker implements Contracts.Consensus.IProposerPicker {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.StateStore)
	private readonly state!: Contracts.State.StateStore;

	private validatorIndexMatrix: Array<number> = [];

	public handleCommittedBlock(commit: Contracts.Crypto.IBlockCommit): void {
		const { activeValidators } = this.configuration.getMilestone();

		const { height } = commit;
		if (this.validatorIndexMatrix.length === 0 || (height % activeValidators === 0)) {
			const roundHeight = height - (height % activeValidators) + 1;
			this.#updateValidatorMatrix(activeValidators, roundHeight);
		}
	}

	public getValidatorIndex(round: number): number {
		const totalRound = this.#getTotalRound(round);
		const { activeValidators } = this.configuration.getMilestone();

		const offset = totalRound % activeValidators;
		return this.validatorIndexMatrix[offset % activeValidators];
	}

	#updateValidatorMatrix(activeValidators: number, height: number): void {
		const seed = this.#calculateSeed(height);
		const rng = seedrandom(seed);

		const matrix = [...new Array(activeValidators).keys()];

		// Based on https://stackoverflow.com/a/12646864
		for (let index = matrix.length - 1; index > 0; index--) {
			const index_ = Math.floor(rng() * (index + 1));
			[matrix[index], matrix[index_]] = [matrix[index_], matrix[index]];
		}

		this.validatorIndexMatrix = matrix;
	}

	#calculateSeed(round: number): string {
		const totalRound = this.#getTotalRound(round);

		// TODO: take block id into account

		return `${totalRound}`;
	}

	#getTotalRound(round: number): number {
		const committedRound = this.state.getLastCommittedRound();
		return committedRound + round;
	}
}
