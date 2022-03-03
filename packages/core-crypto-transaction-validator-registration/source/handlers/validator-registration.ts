import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Exceptions, Identifiers } from "@arkecosystem/core-contracts";
import Transactions from "@arkecosystem/core-crypto-transaction";
import { Enums as AppEnums, Utils as AppUtils } from "@arkecosystem/core-kernel";
import { Handlers } from "@arkecosystem/core-transactions";
import { BigNumber } from "@arkecosystem/utils";

import { ValidatorRegistrationTransaction } from "../versions";

// todo: revisit the implementation, container usage and arguments after core-database rework
// todo: replace unnecessary function arguments with dependency injection to avoid passing around references
@injectable()
export class ValidatorRegistrationTransactionHandler extends Handlers.TransactionHandler {
	@inject(Identifiers.TransactionPoolQuery)
	private readonly poolQuery!: Contracts.TransactionPool.Query;

	@inject(Identifiers.TransactionHistoryService)
	private readonly transactionHistoryService!: Contracts.Shared.TransactionHistoryService;

	public dependencies(): ReadonlyArray<Handlers.TransactionHandlerConstructor> {
		return [];
	}

	public walletAttributes(): ReadonlyArray<string> {
		return [
			"validator.approval", // Used by the API
			"validator.forgedFees", // Used by the API
			"validator.forgedRewards", // Used by the API
			"validator.forgedTotal", // Used by the API
			"validator.lastBlock",
			"validator.producedBlocks", // Used by the API
			"validator.rank",
			"validator.round",
			"validator.username",
			"validator.voteBalance",
			"validator",
		];
	}

	public getConstructor(): Transactions.TransactionConstructor {
		return ValidatorRegistrationTransaction;
	}

	public async bootstrap(): Promise<void> {
		const criteria = {
			type: this.getConstructor().type,
			typeGroup: this.getConstructor().typeGroup,
		};

		for await (const transaction of this.transactionHistoryService.streamByCriteria(criteria)) {
			AppUtils.assert.defined<string>(transaction.senderPublicKey);
			AppUtils.assert.defined<string>(transaction.asset?.validator?.username);

			const wallet = await this.walletRepository.findByPublicKey(transaction.senderPublicKey);

			wallet.setAttribute<Contracts.State.WalletValidatorAttributes>("validator", {
				forgedFees: BigNumber.ZERO,
				forgedRewards: BigNumber.ZERO,
				producedBlocks: 0,
				rank: undefined,
				username: transaction.asset.validator.username,
				voteBalance: BigNumber.ZERO,
			});

			this.walletRepository.index(wallet);
		}

		const forgedBlocks = await this.blockRepository.getValidatorsForgedBlocks();
		const lastForgedBlocks = await this.blockRepository.getLastForgedBlocks();
		for (const block of forgedBlocks) {
			const wallet: Contracts.State.Wallet = await this.walletRepository.findByPublicKey(
				block.generatorPublicKey,
			);

			// Genesis wallet is empty
			if (!wallet.hasAttribute("validator")) {
				continue;
			}

			const validator: Contracts.State.WalletValidatorAttributes = wallet.getAttribute("validator");
			validator.forgedFees = validator.forgedFees.plus(block.totalFees);
			validator.forgedRewards = validator.forgedRewards.plus(block.totalRewards);
			validator.producedBlocks += +block.totalProduced;
		}

		for (const block of lastForgedBlocks) {
			const wallet: Contracts.State.Wallet = await this.walletRepository.findByPublicKey(
				block.generatorPublicKey,
			);

			// Genesis wallet is empty
			if (!wallet.hasAttribute("validator")) {
				continue;
			}

			wallet.setAttribute("validator.lastBlock", block);
		}
	}

	public async isActivated(): Promise<boolean> {
		return true;
	}

	public async throwIfCannotBeApplied(
		transaction: Contracts.Crypto.ITransaction,
		wallet: Contracts.State.Wallet,
	): Promise<void> {
		const { data }: Contracts.Crypto.ITransaction = transaction;

		AppUtils.assert.defined<string>(data.senderPublicKey);

		const sender: Contracts.State.Wallet = await this.walletRepository.findByPublicKey(data.senderPublicKey);

		if (sender.hasMultiSignature()) {
			throw new Exceptions.NotSupportedForMultiSignatureWalletError();
		}

		AppUtils.assert.defined<string>(data.asset?.validator?.username);

		const username: string = data.asset.validator.username;

		if (wallet.isValidator()) {
			throw new Exceptions.WalletIsAlreadyValidatorError();
		}

		if (this.walletRepository.hasByUsername(username)) {
			throw new Exceptions.WalletUsernameAlreadyRegisteredError(username);
		}

		return super.throwIfCannotBeApplied(transaction, wallet);
	}

	public emitEvents(transaction: Contracts.Crypto.ITransaction, emitter: Contracts.Kernel.EventDispatcher): void {
		emitter.dispatch(AppEnums.ValidatorEvent.Registered, transaction.data);
	}

	public async throwIfCannotEnterPool(transaction: Contracts.Crypto.ITransaction): Promise<void> {
		AppUtils.assert.defined<string>(transaction.data.senderPublicKey);

		const hasSender: boolean = this.poolQuery
			.getAllBySender(transaction.data.senderPublicKey)
			.whereKind(transaction)
			.has();

		if (hasSender) {
			throw new Exceptions.PoolError(
				`Sender ${transaction.data.senderPublicKey} already has a transaction of type '${Contracts.Crypto.TransactionType.ValidatorRegistration}' in the pool`,
				"ERR_PENDING",
			);
		}

		AppUtils.assert.defined<string>(transaction.data.asset?.validator?.username);
		const username: string = transaction.data.asset.validator.username;
		const hasUsername: boolean = this.poolQuery
			.getAll()
			.whereKind(transaction)
			.wherePredicate(async (t) => t.data.asset?.validator?.username === username)
			.has();

		if (hasUsername) {
			throw new Exceptions.PoolError(
				`Validator registration for "${username}" already in the pool`,
				"ERR_PENDING",
			);
		}
	}

	public async applyToSender(transaction: Contracts.Crypto.ITransaction): Promise<void> {
		await super.applyToSender(transaction);

		AppUtils.assert.defined<string>(transaction.data.senderPublicKey);

		const sender: Contracts.State.Wallet = await this.walletRepository.findByPublicKey(
			transaction.data.senderPublicKey,
		);

		AppUtils.assert.defined<string>(transaction.data.asset?.validator?.username);

		sender.setAttribute<Contracts.State.WalletValidatorAttributes>("validator", {
			forgedFees: BigNumber.ZERO,
			forgedRewards: BigNumber.ZERO,
			producedBlocks: 0,
			round: 0,
			username: transaction.data.asset.validator.username,
			voteBalance: BigNumber.ZERO,
		});

		this.walletRepository.index(sender);
	}

	public async revertForSender(transaction: Contracts.Crypto.ITransaction): Promise<void> {
		await super.revertForSender(transaction);

		AppUtils.assert.defined<string>(transaction.data.senderPublicKey);

		const sender: Contracts.State.Wallet = await this.walletRepository.findByPublicKey(
			transaction.data.senderPublicKey,
		);

		sender.forgetAttribute("validator");

		this.walletRepository.index(sender);
	}

	public async applyToRecipient(transaction: Contracts.Crypto.ITransaction): Promise<void> {}

	public async revertForRecipient(transaction: Contracts.Crypto.ITransaction): Promise<void> {}
}
