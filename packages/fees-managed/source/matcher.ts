import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { FeeRegistry } from "@mainsail/fees";
import { Providers } from "@mainsail/kernel";
import { BigNumber } from "@mainsail/utils";

@injectable()
export class FeeMatcher implements Contracts.TransactionPool.FeeMatcher {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Fee.Registry)
	private readonly feeRegistry!: FeeRegistry;

	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "fees-managed")
	private readonly pluginConfiguration!: Providers.PluginConfiguration;

	public async throwIfCannotEnterPool(transaction: Contracts.Crypto.Transaction): Promise<void> {
		await this.#throwIfCannot("pool", transaction);
	}

	public async throwIfCannotBroadcast(transaction: Contracts.Crypto.Transaction): Promise<void> {
		await this.#throwIfCannot("broadcast", transaction);
	}

	async #throwIfCannot(action: string, transaction: Contracts.Crypto.Transaction): Promise<void> {
		const feeString = this.#formatSatoshi(transaction.data.fee);

		const minFee = this.#calculateMinFee(transaction);
		const minFeeString = this.#formatSatoshi(minFee);

		if (transaction.data.fee.isGreaterThanEqual(minFee)) {
			this.logger.debug(`Tx ${transaction} eligible for ${action} (fee ${feeString} >= ${minFeeString})`);

			return;
		}

		this.logger.notice(`Tx ${transaction} not eligible for ${action} (fee ${feeString} < ${minFeeString})`);

		throw new Exceptions.TransactionFeeTooLowError(transaction);
	}

	#calculateMinFee(transaction: Contracts.Crypto.Transaction): BigNumber {
		const addonBytes = this.feeRegistry.get(transaction.key, transaction.data.version) || BigNumber.ZERO;
		const satoshiPerByte: number = this.pluginConfiguration.getOptional("satoshiPerByte", 0);

		const transactionSizeInBytes: number = Math.round(transaction.serialized.length / 2);

		return addonBytes.plus(transactionSizeInBytes).times(satoshiPerByte);
	}

	#formatSatoshi(amount: BigNumber): string {
		const { decimals, denomination } = this.configuration.getMilestone().satoshi;

		const localeString = (+amount / denomination).toLocaleString("en", {
			maximumFractionDigits: decimals,
			minimumFractionDigits: 0,
		});

		return `${localeString} ${this.configuration.get("network.client.symbol")}`;
	}
}
