import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { FeeRegistry } from "@mainsail/fees";
import { BigNumber } from "@mainsail/utils";

@injectable()
export class FeeMatcher implements Contracts.TransactionPool.FeeMatcher {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Fee.Registry)
	private readonly feeRegistry!: FeeRegistry;

	public async throwIfCannotEnterPool(transaction: Contracts.Crypto.Transaction): Promise<void> {
		this.#throwIfCannot("pool", transaction);
	}

	public async throwIfCannotBroadcast(transaction: Contracts.Crypto.Transaction): Promise<void> {
		this.#throwIfCannot("broadcast", transaction);
	}

	#throwIfCannot(action: string, transaction: Contracts.Crypto.Transaction): void {
		const feeString = this.#formatSatoshi(transaction.data.fee);

		const staticFee = this.feeRegistry.get(transaction.key, transaction.data.version);
		const staticFeeString = this.#formatSatoshi(staticFee);

		if (transaction.data.fee.isEqualTo(staticFee)) {
			this.logger.debug(`${transaction.id} eligible for ${action} (fee ${feeString} = ${staticFeeString})`);

			return undefined;
		}

		if (transaction.data.fee.isLessThan(staticFee)) {
			this.logger.notice(`${transaction.id} not eligible for ${action} (fee ${feeString} < ${staticFeeString})`);

			throw new Exceptions.TransactionFeeToLowError(transaction);
		}

		this.logger.notice(`${transaction.id} not eligible for ${action} (fee ${feeString} > ${staticFeeString})`);

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
