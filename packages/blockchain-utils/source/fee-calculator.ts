import type { Contracts } from "@mainsail/contracts";

import { injectable } from "@mainsail/container";
import { BigNumber } from "@mainsail/utils";

@injectable()
export class FeeCalculator implements Contracts.BlockchainUtils.FeeCalculator {
	public calculate(transaction: Contracts.Crypto.Transaction): BigNumber {
		return BigNumber.make(transaction.gasPrice).times(transaction.gasLimit);
	}

	public calculateConsumed(gasPrice: number, gasUsed: number): BigNumber {
		return BigNumber.make(gasPrice).times(gasUsed);
	}
}
