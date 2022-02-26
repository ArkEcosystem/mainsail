import { FeeRegistry, TransactionFeeToLowError } from "@arkecosystem/core-fees";
import { Container, Contracts } from "@arkecosystem/core-kernel";
import { BigNumber } from "@arkecosystem/utils";
import { ITransaction } from "@arkecosystem/core-crypto-contracts";

@Container.injectable()
export class FeeMatcher implements Contracts.TransactionPool.FeeMatcher {
	@Container.inject(Container.Identifiers.LogService)
	private readonly logger: Contracts.Kernel.Logger;

	@Container.inject(Container.Identifiers.Fee.Registry)
	private readonly feeRegistry: FeeRegistry;

	public async throwIfCannotEnterPool(transaction: ITransaction): Promise<void> {
		await this.#throwIfCannot("pool", transaction);
	}

	public async throwIfCannotBroadcast(transaction: ITransaction): Promise<void> {
		await this.#throwIfCannot("broadcast", transaction);
	}

	async #throwIfCannot(action: string, transaction: ITransaction): Promise<void> {
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

	#calculateMinFee(transaction: ITransaction): BigNumber {
		const addonBytes = this.feeRegistry.get(transaction.key, transaction.data.version) || 0;
		const satoshiPerByte = 3000; // @TODO

		const transactionSizeInBytes: number = Math.round(transaction.serialized.length / 2);

		return BigNumber.make(addonBytes + transactionSizeInBytes).times(satoshiPerByte);
	}
}
