import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class ProposerCalculator implements Contracts.BlockchainUtils.ProposerCalculator {
	public getValidatorIndex(round: number): number {
		return 0;
	}
}
