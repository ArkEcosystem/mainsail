import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Exceptions, Identifiers } from "@arkecosystem/core-contracts";
import { FeeRegistry } from "@arkecosystem/core-fees";
import { BigNumber } from "@arkecosystem/utils";

@injectable()
export class FeeMatcher implements Contracts.TransactionPool.FeeMatcher {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.LogService)
	private readonly logger: Contracts.Kernel.Logger;

	@inject(Identifiers.Fee.Registry)
	private readonly feeRegistry: FeeRegistry;

	public async throwIfCannotEnterPool(transaction: Contracts.Crypto.ITransaction): Promise<void> {
		await this.#throwIfCannot("pool", transaction);
	}

	public async throwIfCannotBroadcast(transaction: Contracts.Crypto.ITransaction): Promise<void> {
		await this.#throwIfCannot("broadcast", transaction);
	}

	async #throwIfCannot(action: string, transaction: Contracts.Crypto.ITransaction): Promise<void> {
		const feeString = this.#formatSatoshi(transaction.data.fee);

		const minFee = this.#calculateMinFee(transaction);
		const minFeeString = this.#formatSatoshi(minFee);

		if (transaction.data.fee.isGreaterThanEqual(minFee)) {
			this.logger.debug(`${transaction} eligible for ${action} (fee ${feeString} >= ${minFeeString})`);

			return;
		}

		this.logger.notice(`${transaction} not eligible for ${action} (fee ${feeString} < ${minFeeString})`);

		throw new Exceptions.TransactionFeeToLowError(transaction);
	}

	#calculateMinFee(transaction: Contracts.Crypto.ITransaction): BigNumber {
		const addonBytes = this.feeRegistry.get(transaction.key, transaction.data.version) || BigNumber.ZERO;
		const satoshiPerByte = 3000; // @TODO: make configurable

		const transactionSizeInBytes: number = Math.round(transaction.serialized.length / 2);

		return addonBytes.plus(transactionSizeInBytes).times(satoshiPerByte);
	}

	#formatSatoshi(amount: BigNumber): string {
		// @TODO: make 1e8 configurable
		const localeString = (+amount / 1e8).toLocaleString("en", {
			maximumFractionDigits: 8,
			minimumFractionDigits: 0,
		});

		return `${localeString} ${this.configuration.get("network.client.symbol")}`;
	}
}
