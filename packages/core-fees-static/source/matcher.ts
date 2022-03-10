import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Exceptions, Identifiers } from "@arkecosystem/core-contracts";
import { FeeRegistry } from "@arkecosystem/core-fees";
import { BigNumber } from "packages/utils/distribution";

@injectable()
export class FeeMatcher implements Contracts.TransactionPool.FeeMatcher {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.LogService)
	private readonly logger: Contracts.Kernel.Logger;

	@inject(Identifiers.Fee.Registry)
	private readonly feeRegistry: FeeRegistry;

	public async throwIfCannotEnterPool(transaction: Contracts.Crypto.ITransaction): Promise<void> {
		this.#throwIfCannot("pool", transaction);
	}

	public async throwIfCannotBroadcast(transaction: Contracts.Crypto.ITransaction): Promise<void> {
		this.#throwIfCannot("broadcast", transaction);
	}

	#throwIfCannot(action: string, transaction: Contracts.Crypto.ITransaction): void {
		const feeString = this.#formatSatoshi(transaction.data.fee);

		const staticFee = this.feeRegistry.get(transaction.key, transaction.data.version);
		const staticFeeString = this.#formatSatoshi(staticFee);

		if (transaction.data.fee.isEqualTo(staticFee)) {
			this.logger.debug(`${transaction} eligible for ${action} (fee ${feeString} = ${staticFeeString})`);

			return undefined;
		}

		if (transaction.data.fee.isLessThan(staticFee)) {
			this.logger.notice(`${transaction} not eligible for ${action} (fee ${feeString} < ${staticFeeString})`);

			throw new Exceptions.TransactionFeeToLowError(transaction);
		}

		this.logger.notice(`${transaction} not eligible for ${action} (fee ${feeString} > ${staticFeeString})`);

		throw new Exceptions.TransactionFeeToHighError(transaction);
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
