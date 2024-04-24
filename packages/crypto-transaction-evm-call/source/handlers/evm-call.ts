import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { TransactionConstructor } from "@mainsail/crypto-transaction";
import { Utils as AppUtils } from "@mainsail/kernel";
import { Handlers } from "@mainsail/transactions";

import { EvmCallTransaction } from "../versions/index.js";

@injectable()
export class EvmCallTransactionHandler extends Handlers.TransactionHandler {
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
		AppUtils.assert.defined<Contracts.Crypto.EvmCallAsset>(transaction.data.asset?.evmCall);

		const { evmCall } = transaction.data.asset;

		const sender = await context.walletRepository.findByPublicKey(transaction.data.senderPublicKey);

		try {
			const { receipt } = await context.evm.process({
				readonly: false,
				caller: sender.getAddress(),
				data: Buffer.from(evmCall.payload, "hex"),
				recipient: transaction.data.recipientId,
			});

			// TODO: handle result
			// - like subtracting gas from sender
			// - populating indexes, etc.
			this.logger.debug(`executed EVM call (success=${receipt.success}, gasUsed=${receipt.gasUsed})`);
		} catch (error) {
			this.logger.critical(`invalid EVM call: ${error.stack}`);
		}
	}
}
