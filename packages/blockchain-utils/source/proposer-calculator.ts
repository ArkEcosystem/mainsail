import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class ProposerCalculator implements Contracts.BlockchainUtils.ProposerCalculator {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.State.Store)
	private readonly stateStore!: Contracts.State.Store;

	public getValidatorIndex(round: number): number {
		const { roundValidators } = this.configuration.getMilestone();

		return (this.stateStore.getTotalRound() + round) % roundValidators; // This method will work fine on roundValidators change. We are not trying to get sequential indexes on value change, because validators are randomized every round.
	}
}
