import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";
import seedrandom from "seedrandom";

@injectable()
export class ProposerPicker implements Contracts.Consensus.IProposerPicker {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.StateStore)
	private readonly state!: Contracts.State.StateStore;

	private validatorIndexMatrix: Array<number> = [];

	public async onCommit(unit: Contracts.BlockProcessor.IProcessableUnit): Promise<void> {
		const committedBlock = await unit.getCommittedBlock();
		const { height } = committedBlock.block.header;
		if (
			this.validatorIndexMatrix.length === 0 ||
			Utils.roundCalculator.isNewRound(height + 1, this.configuration)
		) {
			const { activeValidators } = this.configuration.getMilestone();
			this.#updateValidatorMatrix(activeValidators);
		}
	}

	public getValidatorIndex(round: number): number {
		const totalRound = this.#getTotalRound(round);
		const { activeValidators } = this.configuration.getMilestone();

		const offset = totalRound % activeValidators;
		return this.validatorIndexMatrix[offset % activeValidators];
	}

	#updateValidatorMatrix(activeValidators: number): void {
		const seed = this.#calculateSeed();
		const rng = seedrandom(seed);

		const matrix = [...Array.from({ length: activeValidators }).keys()];

		// Based on https://stackoverflow.com/a/12646864
		for (let index = matrix.length - 1; index > 0; index--) {
			const index_ = Math.floor(rng() * (index + 1));
			[matrix[index], matrix[index_]] = [matrix[index_], matrix[index]];
		}

		this.validatorIndexMatrix = matrix;
	}

	#calculateSeed(): string {
		const totalRound = this.state.getLastCommittedRound();

		// TODO: take block id into account

		return `${totalRound}`;
	}

	#getTotalRound(round: number): number {
		const committedRound = this.state.getLastCommittedRound();

		return committedRound + round;
	}
}
