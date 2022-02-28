import Interfaces, { TransactionType } from "@arkecosystem/core-crypto-contracts";
import Transactions from "@arkecosystem/core-crypto-transaction";
import { DelegateRegistrationTransaction } from "@arkecosystem/core-crypto-transaction-delegate-registration";
import { Container, Contracts, Enums as AppEnums, Utils as AppUtils } from "@arkecosystem/core-kernel";
import { BigNumber } from "@arkecosystem/utils";

import {
	NotSupportedForMultiSignatureWalletError,
	WalletIsAlreadyDelegateError,
	WalletUsernameAlreadyRegisteredError,
} from "../../errors";
import { TransactionHandler, TransactionHandlerConstructor } from "../transaction";

// todo: revisit the implementation, container usage and arguments after core-database rework
// todo: replace unnecessary function arguments with dependency injection to avoid passing around references
@Container.injectable()
export class DelegateRegistrationTransactionHandler extends TransactionHandler {
	@Container.inject(Container.Identifiers.TransactionPoolQuery)
	private readonly poolQuery!: Contracts.TransactionPool.Query;

	@Container.inject(Container.Identifiers.TransactionHistoryService)
	private readonly transactionHistoryService!: Contracts.Shared.TransactionHistoryService;

	public dependencies(): ReadonlyArray<TransactionHandlerConstructor> {
		return [];
	}

	public walletAttributes(): ReadonlyArray<string> {
		return [
			"delegate.approval", // Used by the API
			"delegate.forgedFees", // Used by the API
			"delegate.forgedRewards", // Used by the API
			"delegate.forgedTotal", // Used by the API
			"delegate.lastBlock",
			"delegate.producedBlocks", // Used by the API
			"delegate.rank",
			"delegate.round",
			"delegate.username",
			"delegate.voteBalance",
			"delegate",
		];
	}

	public getConstructor(): Transactions.TransactionConstructor {
		return DelegateRegistrationTransaction;
	}

	public async bootstrap(): Promise<void> {
		const criteria = {
			type: this.getConstructor().type,
			typeGroup: this.getConstructor().typeGroup,
		};

		for await (const transaction of this.transactionHistoryService.streamByCriteria(criteria)) {
			AppUtils.assert.defined<string>(transaction.senderPublicKey);
			AppUtils.assert.defined<string>(transaction.asset?.delegate?.username);

			const wallet = this.walletRepository.findByPublicKey(transaction.senderPublicKey);

			wallet.setAttribute<Contracts.State.WalletDelegateAttributes>("delegate", {
				forgedFees: BigNumber.ZERO,
				forgedRewards: BigNumber.ZERO,
				producedBlocks: 0,
				rank: undefined,
				username: transaction.asset.delegate.username,
				voteBalance: BigNumber.ZERO,
			});

			this.walletRepository.index(wallet);
		}

		const forgedBlocks = await this.blockRepository.getDelegatesForgedBlocks();
		const lastForgedBlocks = await this.blockRepository.getLastForgedBlocks();
		for (const block of forgedBlocks) {
			const wallet: Contracts.State.Wallet = this.walletRepository.findByPublicKey(block.generatorPublicKey);

			// Genesis wallet is empty
			if (!wallet.hasAttribute("delegate")) {
				continue;
			}

			const delegate: Contracts.State.WalletDelegateAttributes = wallet.getAttribute("delegate");
			delegate.forgedFees = delegate.forgedFees.plus(block.totalFees);
			delegate.forgedRewards = delegate.forgedRewards.plus(block.totalRewards);
			delegate.producedBlocks += +block.totalProduced;
		}

		for (const block of lastForgedBlocks) {
			const wallet: Contracts.State.Wallet = this.walletRepository.findByPublicKey(block.generatorPublicKey);

			// Genesis wallet is empty
			if (!wallet.hasAttribute("delegate")) {
				continue;
			}

			wallet.setAttribute("delegate.lastBlock", block);
		}
	}

	public async isActivated(): Promise<boolean> {
		return true;
	}

	public async throwIfCannotBeApplied(
		transaction: Interfaces.ITransaction,
		wallet: Contracts.State.Wallet,
	): Promise<void> {
		const { data }: Interfaces.ITransaction = transaction;

		AppUtils.assert.defined<string>(data.senderPublicKey);

		const sender: Contracts.State.Wallet = this.walletRepository.findByPublicKey(data.senderPublicKey);

		if (sender.hasMultiSignature()) {
			throw new NotSupportedForMultiSignatureWalletError();
		}

		AppUtils.assert.defined<string>(data.asset?.delegate?.username);

		const username: string = data.asset.delegate.username;

		if (wallet.isDelegate()) {
			throw new WalletIsAlreadyDelegateError();
		}

		if (this.walletRepository.hasByUsername(username)) {
			throw new WalletUsernameAlreadyRegisteredError(username);
		}

		return super.throwIfCannotBeApplied(transaction, wallet);
	}

	public emitEvents(transaction: Interfaces.ITransaction, emitter: Contracts.Kernel.EventDispatcher): void {
		emitter.dispatch(AppEnums.DelegateEvent.Registered, transaction.data);
	}

	public async throwIfCannotEnterPool(transaction: Interfaces.ITransaction): Promise<void> {
		AppUtils.assert.defined<string>(transaction.data.senderPublicKey);

		const hasSender: boolean = this.poolQuery
			.getAllBySender(transaction.data.senderPublicKey)
			.whereKind(transaction)
			.has();

		if (hasSender) {
			throw new Contracts.TransactionPool.PoolError(
				`Sender ${transaction.data.senderPublicKey} already has a transaction of type '${TransactionType.DelegateRegistration}' in the pool`,
				"ERR_PENDING",
			);
		}

		AppUtils.assert.defined<string>(transaction.data.asset?.delegate?.username);
		const username: string = transaction.data.asset.delegate.username;
		const hasUsername: boolean = this.poolQuery
			.getAll()
			.whereKind(transaction)
			.wherePredicate(async (t) => t.data.asset?.delegate?.username === username)
			.has();

		if (hasUsername) {
			throw new Contracts.TransactionPool.PoolError(
				`Delegate registration for "${username}" already in the pool`,
				"ERR_PENDING",
			);
		}
	}

	public async applyToSender(transaction: Interfaces.ITransaction): Promise<void> {
		await super.applyToSender(transaction);

		AppUtils.assert.defined<string>(transaction.data.senderPublicKey);

		const sender: Contracts.State.Wallet = this.walletRepository.findByPublicKey(transaction.data.senderPublicKey);

		AppUtils.assert.defined<string>(transaction.data.asset?.delegate?.username);

		sender.setAttribute<Contracts.State.WalletDelegateAttributes>("delegate", {
			forgedFees: BigNumber.ZERO,
			forgedRewards: BigNumber.ZERO,
			producedBlocks: 0,
			round: 0,
			username: transaction.data.asset.delegate.username,
			voteBalance: BigNumber.ZERO,
		});

		this.walletRepository.index(sender);
	}

	public async revertForSender(transaction: Interfaces.ITransaction): Promise<void> {
		await super.revertForSender(transaction);

		AppUtils.assert.defined<string>(transaction.data.senderPublicKey);

		const sender: Contracts.State.Wallet = this.walletRepository.findByPublicKey(transaction.data.senderPublicKey);

		sender.forgetAttribute("delegate");

		this.walletRepository.index(sender);
	}

	public async applyToRecipient(transaction: Interfaces.ITransaction): Promise<void> {}

	public async revertForRecipient(transaction: Interfaces.ITransaction): Promise<void> {}
}
