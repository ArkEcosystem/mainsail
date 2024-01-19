import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";
import seedrandom from "seedrandom";

@injectable()
export class Selector implements Contracts.Proposer.Selector {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.State.Service)
	private readonly stateService!: Contracts.State.Service;

	public async onCommit(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		const commit = await unit.getCommit();
		const { height } = commit.block.header;
		if (Utils.roundCalculator.isNewRound(height + 1, this.configuration)) {
			const { activeValidators } = this.configuration.getMilestone(
				Math.max(this.configuration.getHeight(), 1)
			);
			this.#updateValidatorMatrix(activeValidators);
		}
	}

	public getValidatorIndex(round: number): number {
		const { activeValidators } = this.configuration.getMilestone(
			Math.max(this.configuration.getHeight(), 1)
		);

		const offset = (this.stateService.getStore().getTotalRound() + round) % activeValidators;
		const result = JSON.parse(this.stateService.getStore().getAttribute("validatorMatrix"))[
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

		this.stateService.getStore().setAttribute<string>("validatorMatrix", JSON.stringify(matrix));
	}

	#calculateSeed(): string {
		const totalRound = this.stateService.getStore().getTotalRound();

		// TODO: take block id into account

		return `${totalRound}`;
	}
}
