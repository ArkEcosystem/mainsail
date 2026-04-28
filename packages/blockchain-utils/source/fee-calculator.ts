import type { Contracts } from "@mainsail/contracts";

import { injectable } from "@mainsail/container";

@injectable()
export class FeeCalculator implements Contracts.BlockchainUtils.FeeCalculator {
	public calculate(transaction: Contracts.Crypto.Transaction): bigint {
		return BigInt(transaction.gasPrice) * BigInt(transaction.gasLimit);
	}

	public calculateConsumed(gasPrice: number, gasUsed: bigint): bigint {
		return BigInt(gasPrice) * gasUsed;
	}
}
