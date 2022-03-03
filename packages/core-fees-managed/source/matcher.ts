import Contracts, { Crypto, Identifiers } from "@arkecosystem/core-contracts";
import { FeeRegistry } from "@arkecosystem/core-fees";
import { TransactionFeeToLowError } from "@arkecosystem/core-contracts";
import { inject, injectable } from "@arkecosystem/core-container";
import { BigNumber } from "@arkecosystem/utils";

@injectable()
export class FeeMatcher implements Contracts.TransactionPool.FeeMatcher {
	@inject(Identifiers.LogService)
	private readonly logger: Contracts.Kernel.Logger;

	@inject(Identifiers.Fee.Registry)
	private readonly feeRegistry: FeeRegistry;

	public async throwIfCannotEnterPool(transaction: Crypto.ITransaction): Promise<void> {
		await this.#throwIfCannot("pool", transaction);
	}

	public async throwIfCannotBroadcast(transaction: Crypto.ITransaction): Promise<void> {
		await this.#throwIfCannot("broadcast", transaction);
	}

	async #throwIfCannot(action: string, transaction: Crypto.ITransaction): Promise<void> {
		const feeString = transaction.data.fee; // @TODO

		const minFee: BigNumber = this.#calculateMinFee(transaction);
		const minFeeString = minFee; // @TODO

		if (transaction.data.fee.isGreaterThanEqual(minFee)) {
			this.logger.debug(`${transaction} eligible for ${action} (fee ${feeString} >= ${minFeeString})`);

			return;
		}

		this.logger.notice(`${transaction} not eligible for ${action} (fee ${feeString} < ${minFeeString})`);

		throw new TransactionFeeToLowError(transaction);
	}

	#calculateMinFee(transaction: Crypto.ITransaction): BigNumber {
		const addonBytes = this.feeRegistry.get(transaction.key, transaction.data.version) || 0;
		const satoshiPerByte = 3000; // @TODO

		const transactionSizeInBytes: number = Math.round(transaction.serialized.length / 2);

		return BigNumber.make(addonBytes + transactionSizeInBytes).times(satoshiPerByte);
	}
}
