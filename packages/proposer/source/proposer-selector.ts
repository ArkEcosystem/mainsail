import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";
import seedrandom from "seedrandom";

@injectable()
export class ProposerSelector implements Contracts.Proposer.ProposerSelector {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.StateService)
	private readonly stateService!: Contracts.State.Service;

	public async onCommit(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		const committedBlock = await unit.getCommittedBlock();
		const { height } = committedBlock.block.header;
		if (Utils.roundCalculator.isNewRound(height + 1, this.configuration)) {
			const { activeValidators } = this.configuration.getMilestone();
			this.#updateValidatorMatrix(activeValidators);
		}
	}

	public getValidatorIndex(round: number): number {
		const { activeValidators } = this.configuration.getMilestone();

		const offset = (this.stateService.getStateStore().getTotalRound() + round) % activeValidators;
		const result = JSON.parse(this.stateService.getStateStore().getAttribute("validatorMatrix"))[
			offset % activeValidators
		];
		Utils.assert.defined<number>(result);
		return result;
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

		this.stateService.getStateStore().setAttribute<string>("validatorMatrix", JSON.stringify(matrix));
	}

	#calculateSeed(): string {
		const totalRound = this.stateService.getStateStore().getTotalRound();

		// TODO: take block id into account

		return `${totalRound}`;
	}
}
