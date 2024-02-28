import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import Transactions from "@mainsail/crypto-transaction";
import { Bindings } from "@mainsail/evm";
import { Utils as AppUtils } from "@mainsail/kernel";
import { Handlers } from "@mainsail/transactions";

import { EvmCallTransaction } from "../versions";

@injectable()
export class EvmCallTransactionHandler extends Handlers.TransactionHandler {
	@inject(Identifiers.Evm.Instance)
	private readonly evm!: Bindings.Evm;

	public dependencies(): ReadonlyArray<Handlers.TransactionHandlerConstructor> {
		return [];
	}

	public getConstructor(): Transactions.TransactionConstructor {
		return EvmCallTransaction;
	}

	public async isActivated(): Promise<boolean> {
		return true;
	}

	public async throwIfCannotBeApplied(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.Transaction,
		wallet: Contracts.State.Wallet,
	): Promise<void> {
		// TODO
		return super.throwIfCannotBeApplied(walletRepository, transaction, wallet);
	}

	public emitEvents(transaction: Contracts.Crypto.Transaction, emitter: Contracts.Kernel.EventDispatcher): void {
		// TODO
	}

	public async throwIfCannotEnterPool(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.Transaction,
	): Promise<void> {
		// TODO
	}

	public async applyToSender(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.Transaction,
	): Promise<void> {
		// TODO: subtract consumed gas only after evm call
		await super.applyToSender(walletRepository, transaction);
	}

	public async applyToRecipient(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.Transaction,
		// tslint:disable-next-line: no-empty
	): Promise<void> {
		AppUtils.assert.defined<Contracts.Crypto.EvmCallAsset>(transaction.data.asset?.evmCall);

		const { evmCall } = transaction.data.asset;

		const sender = await walletRepository.findByPublicKey(transaction.data.senderPublicKey);

		const result = await this.evm.transact({
			caller: sender.getAddress(),
			data: Buffer.from(evmCall.payload, "hex"),
			recipient: transaction.data.recipientId,
		});

		// TODO: handle result
		// - like subtracting gas from sender
		// - populating indexes, etc.
		this.logger.debug(`executed EVM call (success=${result.success}, gasUsed=${result.gasUsed})`);
	}
}
