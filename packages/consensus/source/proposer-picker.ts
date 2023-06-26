import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import seedrandom from "seedrandom";

@injectable()
export class ProposerPicker implements Contracts.Consensus.IProposerPicker {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.IConfiguration;

	public getValidatorIndex(height: number, seed: string): number {
		const { activeValidators } = this.configuration.getMilestone(height);

		const rng = seedrandom(seed);
		return Math.floor(rng() * (activeValidators - 1));
	}
}
