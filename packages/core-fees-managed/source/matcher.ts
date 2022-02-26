import { FeeRegistry, TransactionFeeToLowError } from "@arkecosystem/core-fees";
import { Container, Contracts } from "@arkecosystem/core-kernel";
import { Handlers } from "@arkecosystem/core-transactions";
import { Interfaces, Utils } from "@arkecosystem/crypto";

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
		await this.#throwIfCannot("pool entrance", transaction);
	}

	public async throwIfCannotBroadcast(transaction: Interfaces.ITransaction): Promise<void> {
		await this.#throwIfCannot("broadcast", transaction);
	}

	async #throwIfCannot(action: string, transaction: Interfaces.ITransaction): Promise<void> {
		const feeString = Utils.formatSatoshi(transaction.data.fee);

		const addonBytes: number = this.feeRegistry.get(transaction.key, transaction.data.version);
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
			this.logger.debug(`${transaction} eligible for ${action} (fee ${feeString} >= ${minFeeString})`);

			return;
		}

		this.logger.notice(`${transaction} not eligible for ${action} (fee ${feeString} < ${minFeeString})`);

		throw new TransactionFeeToLowError(transaction);
	}
}
