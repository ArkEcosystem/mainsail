import { inject, injectable } from "@arkecosystem/core-container";
import Contracts, { Crypto, Identifiers } from "@arkecosystem/core-contracts";
import Transactions from "@arkecosystem/core-crypto-transaction";
import { PoolError } from "@arkecosystem/core-contracts";
import { Enums as AppEnums, Utils as AppUtils } from "@arkecosystem/core-kernel";
import { Errors, Handlers } from "@arkecosystem/core-transactions";
import { BigNumber } from "@arkecosystem/utils";

import { DelegateRegistrationTransaction } from "../versions";

// todo: revisit the implementation, container usage and arguments after core-database rework
// todo: replace unnecessary function arguments with dependency injection to avoid passing around references
@injectable()
export class DelegateRegistrationTransactionHandler extends Handlers.TransactionHandler {
	@inject(Identifiers.TransactionPoolQuery)
	private readonly poolQuery!: Contracts.TransactionPool.Query;

	@inject(Identifiers.TransactionHistoryService)
	private readonly transactionHistoryService!: Contracts.Shared.TransactionHistoryService;

	public dependencies(): ReadonlyArray<Handlers.TransactionHandlerConstructor> {
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

			const wallet = await this.walletRepository.findByPublicKey(transaction.senderPublicKey);

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
			const wallet: Contracts.State.Wallet = await this.walletRepository.findByPublicKey(
				block.generatorPublicKey,
			);

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
			const wallet: Contracts.State.Wallet = await this.walletRepository.findByPublicKey(
				block.generatorPublicKey,
			);

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
		transaction: Crypto.ITransaction,
		wallet: Contracts.State.Wallet,
	): Promise<void> {
		const { data }: Crypto.ITransaction = transaction;

		AppUtils.assert.defined<string>(data.senderPublicKey);

		const sender: Contracts.State.Wallet = await this.walletRepository.findByPublicKey(data.senderPublicKey);

		if (sender.hasMultiSignature()) {
			throw new Errors.NotSupportedForMultiSignatureWalletError();
		}

		AppUtils.assert.defined<string>(data.asset?.delegate?.username);

		const username: string = data.asset.delegate.username;

		if (wallet.isDelegate()) {
			throw new Errors.WalletIsAlreadyDelegateError();
		}

		if (this.walletRepository.hasByUsername(username)) {
			throw new Errors.WalletUsernameAlreadyRegisteredError(username);
		}

		return super.throwIfCannotBeApplied(transaction, wallet);
	}

	public emitEvents(transaction: Crypto.ITransaction, emitter: Contracts.Kernel.EventDispatcher): void {
		emitter.dispatch(AppEnums.DelegateEvent.Registered, transaction.data);
	}

	public async throwIfCannotEnterPool(transaction: Crypto.ITransaction): Promise<void> {
		AppUtils.assert.defined<string>(transaction.data.senderPublicKey);

		const hasSender: boolean = this.poolQuery
			.getAllBySender(transaction.data.senderPublicKey)
			.whereKind(transaction)
			.has();

		if (hasSender) {
			throw new PoolError(
				`Sender ${transaction.data.senderPublicKey} already has a transaction of type '${Crypto.TransactionType.DelegateRegistration}' in the pool`,
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
			throw new PoolError(`Delegate registration for "${username}" already in the pool`, "ERR_PENDING");
		}
	}

	public async applyToSender(transaction: Crypto.ITransaction): Promise<void> {
		await super.applyToSender(transaction);

		AppUtils.assert.defined<string>(transaction.data.senderPublicKey);

		const sender: Contracts.State.Wallet = await this.walletRepository.findByPublicKey(
			transaction.data.senderPublicKey,
		);

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

	public async revertForSender(transaction: Crypto.ITransaction): Promise<void> {
		await super.revertForSender(transaction);

		AppUtils.assert.defined<string>(transaction.data.senderPublicKey);

		const sender: Contracts.State.Wallet = await this.walletRepository.findByPublicKey(
			transaction.data.senderPublicKey,
		);

		sender.forgetAttribute("delegate");

		this.walletRepository.index(sender);
	}

	public async applyToRecipient(transaction: Crypto.ITransaction): Promise<void> {}

	public async revertForRecipient(transaction: Crypto.ITransaction): Promise<void> {}
}
