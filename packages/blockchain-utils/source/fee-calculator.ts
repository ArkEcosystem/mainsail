import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

@injectable()
export class FeeCalculator implements Contracts.BlockchainUtils.FeeCalculator {
	public calculate(transaction: Contracts.Crypto.Transaction): Utils.BigNumber {
		return Utils.BigNumber.make(transaction.data.gasPrice).times(transaction.data.gasLimit);
	}

	public calculateConsumed(gasPrice: number, gasUsed: number): Utils.BigNumber {
		return Utils.BigNumber.make(gasPrice).times(gasUsed);
	}
}
