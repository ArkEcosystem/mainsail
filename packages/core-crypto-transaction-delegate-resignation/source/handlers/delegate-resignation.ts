import Contracts, { Crypto, Identifiers } from "@arkecosystem/core-contracts";
import Transactions from "@arkecosystem/core-crypto-transaction";
import { DelegateRegistrationTransactionHandler } from "@arkecosystem/core-crypto-transaction-delegate-registration";
import { Container, Enums as AppEnums, Utils as AppUtils } from "@arkecosystem/core-kernel";
import { Errors, Handlers } from "@arkecosystem/core-transactions";

import { DelegateResignationTransaction } from "../versions";

// todo: revisit the implementation, container usage and arguments after core-database rework
// todo: replace unnecessary function arguments with dependency injection to avoid passing around references
@Container.injectable()
export class DelegateResignationTransactionHandler extends Handlers.TransactionHandler {
	@Container.inject(Identifiers.TransactionPoolQuery)
	private readonly poolQuery!: Contracts.TransactionPool.Query;

	@Container.inject(Identifiers.TransactionHistoryService)
	private readonly transactionHistoryService!: Contracts.Shared.TransactionHistoryService;

	public dependencies(): ReadonlyArray<Handlers.TransactionHandlerConstructor> {
		return [DelegateRegistrationTransactionHandler];
	}

	public walletAttributes(): ReadonlyArray<string> {
		return ["delegate.resigned"];
	}

	public getConstructor(): Transactions.TransactionConstructor {
		return DelegateResignationTransaction;
	}

	public async bootstrap(): Promise<void> {
		const criteria = {
			type: this.getConstructor().type,
			typeGroup: this.getConstructor().typeGroup,
		};

		for await (const transaction of this.transactionHistoryService.streamByCriteria(criteria)) {
			AppUtils.assert.defined<string>(transaction.senderPublicKey);

			const wallet: Contracts.State.Wallet = await this.walletRepository.findByPublicKey(
				transaction.senderPublicKey,
			);
			wallet.setAttribute("delegate.resigned", true);
			this.walletRepository.index(wallet);
		}
	}
	public async isActivated(): Promise<boolean> {
		return this.configuration.getMilestone().aip11 === true;
	}

	public async throwIfCannotBeApplied(
		transaction: Crypto.ITransaction,
		wallet: Contracts.State.Wallet,
	): Promise<void> {
		if (!wallet.isDelegate()) {
			throw new Errors.WalletNotADelegateError();
		}

		if (wallet.hasAttribute("delegate.resigned")) {
			throw new Errors.WalletAlreadyResignedError();
		}

		const requiredDelegatesCount: number = this.configuration.getMilestone().activeDelegates;
		const currentDelegatesCount: number = this.walletRepository
			.allByUsername()
			.filter((w) => w.hasAttribute("delegate.resigned") === false).length;

		if (currentDelegatesCount - 1 < requiredDelegatesCount) {
			throw new Errors.NotEnoughDelegatesError();
		}

		return super.throwIfCannotBeApplied(transaction, wallet);
	}

	public emitEvents(transaction: Crypto.ITransaction, emitter: Contracts.Kernel.EventDispatcher): void {
		emitter.dispatch(AppEnums.DelegateEvent.Resigned, transaction.data);
	}

	public async throwIfCannotEnterPool(transaction: Crypto.ITransaction): Promise<void> {
		AppUtils.assert.defined<string>(transaction.data.senderPublicKey);

		const hasSender: boolean = this.poolQuery
			.getAllBySender(transaction.data.senderPublicKey)
			.whereKind(transaction)
			.has();

		if (hasSender) {
			const wallet: Contracts.State.Wallet = await this.walletRepository.findByPublicKey(
				transaction.data.senderPublicKey,
			);
			throw new Contracts.TransactionPool.PoolError(
				`Delegate resignation for "${wallet.getAttribute("delegate.username")}" already in the pool`,
				"ERR_PENDING",
			);
		}
	}

	public async applyToSender(transaction: Crypto.ITransaction): Promise<void> {
		await super.applyToSender(transaction);

		AppUtils.assert.defined<string>(transaction.data.senderPublicKey);

		const senderWallet = await this.walletRepository.findByPublicKey(transaction.data.senderPublicKey);

		senderWallet.setAttribute("delegate.resigned", true);

		this.walletRepository.index(senderWallet);
	}

	public async revertForSender(transaction: Crypto.ITransaction): Promise<void> {
		await super.revertForSender(transaction);

		AppUtils.assert.defined<string>(transaction.data.senderPublicKey);

		const senderWallet = await this.walletRepository.findByPublicKey(transaction.data.senderPublicKey);

		senderWallet.forgetAttribute("delegate.resigned");

		this.walletRepository.index(senderWallet);
	}

	public async applyToRecipient(
		transaction: Crypto.ITransaction,
		// tslint:disable-next-line: no-empty
	): Promise<void> {}

	public async revertForRecipient(
		transaction: Crypto.ITransaction,
		// tslint:disable-next-line: no-empty
	): Promise<void> {}
}
