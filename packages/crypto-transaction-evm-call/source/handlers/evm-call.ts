import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { TransactionConstructor } from "@mainsail/crypto-transaction";
import { Enums, Utils } from "@mainsail/kernel";
import { Handlers } from "@mainsail/transactions";

import { EvmCallTransaction } from "../versions/index.js";

@injectable()
export class EvmCallTransactionHandler extends Handlers.TransactionHandler {
	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.Evm.Gas.FeeCalculator)
	private readonly gasFeeCalculator!: Contracts.Evm.GasFeeCalculator;

	@inject(Identifiers.State.State)
	private readonly state!: Contracts.State.State;

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
	): Promise<Contracts.Transactions.TransactionApplyResult> {
		await super.applyToSender(context, transaction);

		// Taken from receipt in applyToRecipient
		return { gasUsed: 0 };
	}

	public async applyToRecipient(
		context: Contracts.Transactions.TransactionHandlerContext,
		transaction: Contracts.Crypto.Transaction,
	): Promise<Contracts.Transactions.TransactionApplyResult> {
		Utils.assert.defined<Contracts.Crypto.EvmCallAsset>(transaction.data.asset?.evmCall);

		const { evmCall } = transaction.data.asset;

		const sender = await context.walletRepository.findByPublicKey(transaction.data.senderPublicKey);

		let gasUsed = 0;

		try {
			const { instance, commitKey } = context.evm;
			const { receipt, mocked } = await instance.process({
				caller: sender.getAddress(),
				commitKey,
				data: Buffer.from(evmCall.payload, "hex"),
				gasLimit: BigInt(evmCall.gasLimit),
				recipient: transaction.data.recipientId,
				sequence: transaction.data.sequence,
			});

			// Subtract native fee from sender based on actual consumed gas
			const feeConsumed = this.gasFeeCalculator.calculateConsumed(transaction.data.fee, Number(receipt.gasUsed));
			const newBalance: Utils.BigNumber = sender.getBalance().minus(feeConsumed);
			if (newBalance.isNegative()) {
				throw new Exceptions.InsufficientBalanceError();
			}
			sender.setBalance(newBalance);

			if (!mocked && !receipt.cached) {
				this.logger.debug(
					`executed EVM call (success=${receipt.success}, gasUsed=${receipt.gasUsed} paidNativeFee=${this.#formatSatoshi(feeConsumed)})`,
				);
			}

			gasUsed = Number(receipt.gasUsed);

			void this.#emit(Enums.EvmEvent.TransactionReceipt, {
				receipt,
				sender: sender.getAddress(),
				transactionId: transaction.id,
			});
		} catch (error) {
			this.logger.critical(`invalid EVM call: ${error.stack}`);
		}

		return { gasUsed };
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

	async #emit<T>(event: Contracts.Kernel.EventName, data?: T): Promise<void> {
		if (this.state.isBootstrap()) {
			return;
		}

		return this.events.dispatch(event, data);
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
