import { Container, Contracts } from "@arkecosystem/core-kernel";
import { Handlers } from "@arkecosystem/core-transactions";
import { Interfaces, Utils } from "@arkecosystem/crypto";
import { TransactionFeeToLowError } from "@arkecosystem/core-fees";
import { FeeRegistry } from "@arkecosystem/core-fees";

@Container.injectable()
export class FeeMatcher implements Contracts.TransactionPool.FeeMatcher {
	@Container.inject(Container.Identifiers.TransactionHandlerRegistry)
	@Container.tagged("state", "blockchain")
	private readonly handlerRegistry: Handlers.Registry;

	@Container.inject(Container.Identifiers.StateStore)
	private readonly stateStore: Contracts.State.StateStore;

	@Container.inject(Container.Identifiers.LogService)
	private readonly logger: Contracts.Kernel.Logger;

	@Container.inject(Container.Identifiers.Fee.Registry)
	private readonly feeRegistry: FeeRegistry;

	public async throwIfCannotEnterPool(transaction: Interfaces.ITransaction): Promise<void> {
		const feeString = Utils.formatSatoshi(transaction.data.fee);

		const addonBytes: number = this.feeRegistry.get("managed", transaction.key, transaction.data.version);
		const height: number = this.stateStore.getLastHeight();
		const handler = await this.handlerRegistry.getActivatedHandlerForData(transaction.data);

		const minFeePool: Utils.BigNumber = handler.dynamicFee({
			addonBytes,
			height,
			satoshiPerByte: 3000, // @TODO
			transaction,
		});
		const minFeeString = Utils.formatSatoshi(minFeePool);

		if (transaction.data.fee.isGreaterThanEqual(minFeePool)) {
			this.logger.debug(`${transaction} eligible to enter pool (fee ${feeString} >= ${minFeeString})`);

			return;
		}

		this.logger.notice(`${transaction} not eligible to enter pool (fee ${feeString} < ${minFeeString})`);

		throw new TransactionFeeToLowError(transaction);

		// const staticFeeString = Utils.formatSatoshi(transaction.staticFee);

		// if (transaction.data.fee.isEqualTo(transaction.staticFee)) {
		// 	this.logger.debug(`${transaction} eligible to enter pool (fee ${feeString} = ${staticFeeString})`);

		// 	return;
		// }
		// if (transaction.data.fee.isLessThan(transaction.staticFee)) {
		// 	this.logger.notice(`${transaction} not eligible to enter pool (fee ${feeString} < ${staticFeeString})`);

		// 	throw new TransactionFeeToLowError(transaction);
		// }

		// this.logger.notice(`${transaction} not eligible to enter pool (fee ${feeString} > ${staticFeeString})`);

		// throw new TransactionFeeToHighError(transaction);
	}

	public async throwIfCannotBroadcast(transaction: Interfaces.ITransaction): Promise<void> {
		const feeString = Utils.formatSatoshi(transaction.data.fee);

		const addonBytes: number = this.feeRegistry.get("managed", transaction.key, transaction.data.version);
		const height: number = this.stateStore.getLastHeight();
		const handler = await this.handlerRegistry.getActivatedHandlerForData(transaction.data);

		const minFeeBroadcast: Utils.BigNumber = handler.dynamicFee({
			addonBytes,
			height,
			satoshiPerByte: 3000, // @TODO
			transaction,
		});
		const minFeeString = Utils.formatSatoshi(minFeeBroadcast);

		if (transaction.data.fee.isGreaterThanEqual(minFeeBroadcast)) {
			this.logger.debug(`${transaction} eligible for broadcast (fee ${feeString} >= ${minFeeString})`);

			return;
		}

		this.logger.notice(`${transaction} not eligible for broadcast (fee ${feeString} < ${minFeeString})`);

		throw new TransactionFeeToLowError(transaction);

		// const staticFeeString = Utils.formatSatoshi(transaction.staticFee);

		// if (transaction.data.fee.isEqualTo(transaction.staticFee)) {
		// 	this.logger.debug(`${transaction} eligible for broadcast (fee ${feeString} = ${staticFeeString})`);
		// 	return;
		// }
		// if (transaction.data.fee.isLessThan(transaction.staticFee)) {
		// 	this.logger.notice(`${transaction} not eligible to enter pool (fee ${feeString} < ${staticFeeString})`);
		// 	throw new TransactionFeeToLowError(transaction);
		// }

		// this.logger.notice(`${transaction} not eligible to enter pool (fee ${feeString} > ${staticFeeString})`);
		// throw new TransactionFeeToHighError(transaction);
	}
}
