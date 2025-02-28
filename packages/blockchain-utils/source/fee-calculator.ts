import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";

@injectable()
export class FeeCalculator implements Contracts.BlockchainUtils.FeeCalculator {
	public calculate(transaction: Contracts.Crypto.Transaction): BigNumber {
		return BigNumber.make(transaction.data.gasPrice).times(transaction.data.gasLimit);
	}

	public calculateConsumed(gasPrice: number, gasUsed: number): BigNumber {
		return BigNumber.make(gasPrice).times(gasUsed);
	}
}
