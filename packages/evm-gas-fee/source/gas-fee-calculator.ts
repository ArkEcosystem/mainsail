import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

@injectable()
export class GasFeeCalculator implements Contracts.Evm.GasFeeCalculator {
	@inject(Identifiers.Evm.Gas.Limits)
	private readonly gasLimits!: Contracts.Evm.GasLimits;

	public calculate(transaction: Contracts.Crypto.Transaction): Utils.BigNumber {
		const gasLimit = this.gasLimits.of(transaction);
		return this.#calculate(transaction.data.fee, gasLimit);
	}

	public calculateConsumed(gasFee: Utils.BigNumber, gasUsed: number): Utils.BigNumber {
		return this.#calculate(gasFee, gasUsed);
	}

	#calculate(gasFee: Utils.BigNumber, gasUsed: number): Utils.BigNumber {
		return gasFee.times(gasUsed);
	}
}
