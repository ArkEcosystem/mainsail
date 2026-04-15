import { injectable } from "@mainsail/container";
import type { Contracts } from "@mainsail/contracts";

@injectable()
export class ProposerCalculator implements Contracts.BlockchainUtils.ProposerCalculator {
	public getValidatorIndex(round: number): number {
		return 0;
	}

	public getValidatorIndexFrom(roundValidators: number, totalRound: number, round: number): number {
		return 0;
	}
}
