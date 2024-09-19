import { inject, injectable } from "@mainsail/container";
import { Contracts, Events, Exceptions, Identifiers } from "@mainsail/contracts";
import { TransactionConstructor } from "@mainsail/crypto-transaction";
import { Utils } from "@mainsail/kernel";
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
		return super.throwIfCannotBeApplied(context, transaction, wallet);
	}

	public async throwIfCannotEnterPool(
		context: Contracts.Transactions.TransactionHandlerContext,
		transaction: Contracts.Crypto.Transaction,
	): Promise<void> {}

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
		Utils.assert.defined<string>(transaction.id);

		const { evmCall } = transaction.data.asset;

		const { evmSpec } = this.configuration.getMilestone();
		const sender = await context.walletRepository.findByPublicKey(transaction.data.senderPublicKey);

		try {
			const { instance, blockContext } = context.evm;
			const { receipt } = await instance.process({
				blockContext,
				caller: sender.getAddress(),
				data: Buffer.from(evmCall.payload, "hex"),
				gasLimit: BigInt(evmCall.gasLimit),
				gasPrice: transaction.data.fee.toBigInt(),
				nonce: transaction.data.nonce.toBigInt(),
				recipient: transaction.data.recipientId,
				sequence: transaction.data.sequence,
				specId: evmSpec,
				txHash: transaction.id,
				value: transaction.data.amount.toBigInt(),
			});

			if (instance.mode() === Contracts.Evm.EvmMode.Persistent && !this.state.isBootstrap()) {
				const feeConsumed = this.gasFeeCalculator.calculateConsumed(
					transaction.data.fee,
					Number(receipt.gasUsed),
				);
				this.logger.debug(
					`executed EVM call (success=${receipt.success}, gasUsed=${receipt.gasUsed} paidNativeFee=${Utils.formatCurrency(this.configuration, feeConsumed)} deployed=${receipt.deployedContractAddress})`,
				);

				void this.#emit(Events.EvmEvent.TransactionReceipt, {
					receipt,
					sender: sender.getAddress(),
					transactionId: transaction.id,
				});
			}

			return { gasUsed: Number(receipt.gasUsed), receipt };
		} catch (error) {
			return this.app.terminate("invalid EVM call", error);
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

	async #emit<T>(event: Contracts.Kernel.EventName, data?: T): Promise<void> {
		if (this.state.isBootstrap()) {
			return;
		}

		return this.events.dispatch(event, data);
	}
}
