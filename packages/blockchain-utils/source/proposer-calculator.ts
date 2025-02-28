import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

@injectable()
export class ProposerCalculator implements Contracts.BlockchainUtils.ProposerCalculator {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.State.Store)
	private readonly stateStore!: Contracts.State.Store;

	// TODO: Support validator changes
	private validatorMatrix: number[] = [...Array.from({ length: 53 }).keys()];

	public getValidatorIndex(round: number): number {
		const { activeValidators } = this.configuration.getMilestone();

		const offset = (this.stateStore.getTotalRound() + round) % activeValidators;
		const result = this.validatorMatrix[offset % activeValidators];
		Utils.assert.defined<number>(result);
		return result;
	}
}
