import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { TransactionConstructor } from "@mainsail/crypto-transaction";
import { Utils } from "@mainsail/kernel";
import { Handlers } from "@mainsail/transactions";

import { EvmCallTransaction } from "../versions/index.js";

@injectable()
export class EvmCallTransactionHandler extends Handlers.TransactionHandler {
	@inject(Identifiers.Evm.Gas.FeeCalculator)
	protected readonly gasFeeCalculator!: Contracts.Evm.GasFeeCalculator;

	public dependencies(): ReadonlyArray<Handlers.TransactionHandlerConstructor> {
		return [];
	}

	public getConstructor(): TransactionConstructor {
		return EvmCallTransaction;
	}

	public async isActivated(): Promise<boolean> {
		return true;
	}

	public async throwIfCannotBeApplied(
		context: Contracts.Transactions.TransactionHandlerContext,
		transaction: Contracts.Crypto.Transaction,
		wallet: Contracts.State.Wallet,
	): Promise<void> {
		// TODO
		return super.throwIfCannotBeApplied(context, transaction, wallet);
	}

	public emitEvents(transaction: Contracts.Crypto.Transaction, emitter: Contracts.Kernel.EventDispatcher): void {
		// TODO
	}

	public async throwIfCannotEnterPool(
		context: Contracts.Transactions.TransactionHandlerContext,
		transaction: Contracts.Crypto.Transaction,
	): Promise<void> {
		// TODO
	}

	public async applyToSender(
		context: Contracts.Transactions.TransactionHandlerContext,
		transaction: Contracts.Crypto.Transaction,
	): Promise<void> {
		// TODO: subtract consumed gas only after evm call
		await super.applyToSender(context, transaction);
	}

	public async applyToRecipient(
		context: Contracts.Transactions.TransactionHandlerContext,
		transaction: Contracts.Crypto.Transaction,
	): Promise<void> {
		Utils.assert.defined<Contracts.Crypto.EvmCallAsset>(transaction.data.asset?.evmCall);

		const { evmCall } = transaction.data.asset;

		const sender = await context.walletRepository.findByPublicKey(transaction.data.senderPublicKey);

		try {
			const { instance, commitKey } = context.evm;
			const { receipt } = await instance.process({
				caller: sender.getAddress(),
				gasLimit: BigInt(evmCall.gasLimit),
				commitKey,
				data: Buffer.from(evmCall.payload, "hex"),
				recipient: transaction.data.recipientId,
			});

			// Subtract native fee from sender based on actual consumed gas
			const feeConsumed = this.gasFeeCalculator.calculateConsumed(transaction.data.fee, Number(receipt.gasUsed));
			const newBalance: Utils.BigNumber = sender.getBalance().minus(feeConsumed);
			if (newBalance.isNegative()) {
				throw new Exceptions.InsufficientBalanceError();
			}
			sender.setBalance(newBalance);

			this.logger.debug(
				`executed EVM call (success=${receipt.success}, gasUsed=${receipt.gasUsed} paidNativeFee=${this.#formatSatoshi(feeConsumed)})`,
			);
		} catch (error) {
			this.logger.critical(`invalid EVM call: ${error.stack}`);
		}
	}

	protected verifyTransactionFee(
		context: Contracts.Transactions.TransactionHandlerContext,
		transaction: Contracts.Crypto.Transaction,
		sender: Contracts.State.Wallet,
	): void {
		Utils.assert.defined<Contracts.Crypto.EvmCallAsset>(transaction.data.asset?.evmCall);

		const maxFee = this.gasFeeCalculator.calculate(transaction);
		if (sender.getBalance().minus(maxFee).isNegative() && this.configuration.getHeight() > 0) {
			throw new Exceptions.InsufficientBalanceError();
		}
	}

	protected applyFeeToSender(transaction: Contracts.Crypto.Transaction, sender: Contracts.State.Wallet): void {
		// Fee is taken after EVM execution to take the actual consumed gas into account
	}

	#formatSatoshi(amount: Utils.BigNumber): string {
		const { decimals, denomination } = this.configuration.getMilestone().satoshi;

		const localeString = (+amount / denomination).toLocaleString("en", {
			maximumFractionDigits: decimals,
			minimumFractionDigits: 0,
		});

		return `${localeString} ${this.configuration.get("network.client.symbol")}`;
	}
}
