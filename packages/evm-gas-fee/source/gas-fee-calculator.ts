import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

@injectable()
export class GasFeeCalculator implements Contracts.Evm.GasFeeCalculator {
	public calculate(transaction: Contracts.Crypto.Transaction): Utils.BigNumber {
		return this.#calculate(transaction.data.gasPrice, transaction.data.gasLimit);
	}

	public calculateConsumed(gasPrice: number, gasUsed: number): Utils.BigNumber {
		return this.#calculate(gasPrice, gasUsed);
	}

	#calculate(gasPrice: number, gasUsed: number): Utils.BigNumber {
		return Utils.BigNumber.make(gasPrice).times(gasUsed).times(1e9);
	}
}
