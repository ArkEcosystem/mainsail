import { Container, Contracts } from "@arkecosystem/core-kernel";
import { Interfaces, Utils } from "@arkecosystem/crypto";
import { TransactionFeeToHighError, TransactionFeeToLowError } from "@arkecosystem/core-fees";
import { FeeRegistry } from "@arkecosystem/core-fees";
import { BigNumber } from "@packages/utils/distribution";

@Container.injectable()
export class FeeMatcher implements Contracts.TransactionPool.FeeMatcher {
	@Container.inject(Container.Identifiers.LogService)
	private readonly logger: Contracts.Kernel.Logger;

	@Container.inject(Container.Identifiers.Fee.Registry)
	private readonly feeRegistry: FeeRegistry;

	public async throwIfCannotEnterPool(transaction: Interfaces.ITransaction): Promise<void> {
		this.#throwIfCannot("pool", transaction);
	}

	public async throwIfCannotBroadcast(transaction: Interfaces.ITransaction): Promise<void> {
		this.#throwIfCannot("broadcast", transaction);
	}

	#throwIfCannot(action: string, transaction: Interfaces.ITransaction): void {
		const feeString = Utils.formatSatoshi(transaction.data.fee);

		const staticFee = this.feeRegistry.get(transaction.key, transaction.data.version);
		const staticFeeString = Utils.formatSatoshi(BigNumber.make(staticFee));

		if (transaction.data.fee.isEqualTo(staticFee)) {
			this.logger.debug(`${transaction} eligible for ${action} (fee ${feeString} = ${staticFeeString})`);

			return undefined;
		}

		if (transaction.data.fee.isLessThan(staticFee)) {
			this.logger.notice(`${transaction} not eligible for ${action} (fee ${feeString} < ${staticFeeString})`);

			throw new TransactionFeeToLowError(transaction);
		}

		this.logger.notice(`${transaction} not eligible for ${action} (fee ${feeString} > ${staticFeeString})`);

		throw new TransactionFeeToHighError(transaction);
	}
}
