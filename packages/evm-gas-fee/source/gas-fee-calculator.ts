import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

@injectable()
export class GasFeeCalculator implements Contracts.Evm.GasFeeCalculator {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Evm.Gas.Limits)
	private readonly gasLimits!: Contracts.Evm.GasLimits;

	public calculate(transaction: Contracts.Crypto.Transaction): Utils.BigNumber {
		// Fee calculation example (actual numbers not decided yet)
		//
		// minimum fee: 5
		// maximum gas limit: 2100
		// => 105000
		//
		// where 1 ARK is 100000000
		//
		// Apply a `nativeFeeMultiplier` to approximate native fees, which is
		// picked using the native transfer as a baseline (0.1 ARK)
		//
		// nativeFeeMultiplier: 100
		// => 105000 * 100
		//
		// Therefore, the max fee to pay with the above configuration:
		// 10500000 (~0.15 ARK)
		//
		// Note that the sender must be able to pay the fee assuming the gasLimit is reached during
		// execution. The effective fee might be lower, but we do not know until after it has been executed.
		// The actual fee is deducted in `applyToRecipient`.
		const gasLimit = this.gasLimits.of(transaction);
		return this.#calculate(transaction.data.fee, gasLimit);
	}

	public calculateConsumed(gasFee: Utils.BigNumber, gasUsed: number): Utils.BigNumber {
		return this.#calculate(gasFee, gasUsed);
	}

	#calculate(gasFee: Utils.BigNumber, gasUsed: number): Utils.BigNumber {
		const nativeFeeMultiplier = this.#getNativeFeeMultiplier();
		const maxFee = gasFee.times(gasUsed).times(nativeFeeMultiplier);
		return maxFee;
	}

	#getNativeFeeMultiplier(): number {
		const { evm: evmConfig } = this.configuration.getMilestone();
		const { nativeFeeMultiplier } = evmConfig;
		return nativeFeeMultiplier;
	}
}
