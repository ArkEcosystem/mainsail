import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import seedrandom from "seedrandom";

@injectable()
export class ProposerPicker implements Contracts.Consensus.IProposerPicker {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.StateStore)
	private readonly state!: Contracts.State.StateStore;

	#validatorIndexMatrix: Array<number> = [];

	public get validatorIndexMatrix(): ReadonlyArray<number> {
		return this.#validatorIndexMatrix;
	}

	public handleCommittedBlock(commit: Contracts.Crypto.IBlockCommit): void {
		const { activeValidators } = this.configuration.getMilestone();

		const { height } = commit;
		if (this.validatorIndexMatrix.length === 0 || ((height - 1) % activeValidators === 0)) {
			const roundHeight = height - (height % activeValidators) + 1;
			this.#updateValidatorMatrix(activeValidators, roundHeight);
		}
	}

	public getValidatorIndex(round: number): number {
		const totalRound = this.#getTotalRound(round);
		const { activeValidators } = this.configuration.getMilestone();

		const offset = (totalRound - 1) % activeValidators;
		return this.#validatorIndexMatrix[offset % activeValidators];
	}

	#updateValidatorMatrix(activeValidators: number, height: number): void {
		const seed = this.#calculateSeed(height);
		const rng = seedrandom(seed);

		const matrix = [...Array(activeValidators).keys()];

		// Based on https://stackoverflow.com/a/12646864
		for (let i = matrix.length - 1; i > 0; i--) {
			const j = Math.floor(rng() * (i + 1));
			[matrix[i], matrix[j]] =
				[matrix[j], matrix[i]];
		}

		this.#validatorIndexMatrix = matrix;
	}

	#calculateSeed(round: number): string {
		const totalRound = this.#getTotalRound(round);

		// TODO: take block id into account

		return `${totalRound}`;
	}

	#getTotalRound(round: number): number {
		const committedRound = this.state.getLastCommittedRound();
		return committedRound + round + 1;
	}
}
