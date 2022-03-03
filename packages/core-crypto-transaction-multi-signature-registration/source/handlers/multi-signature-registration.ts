import Contracts, { Crypto, Identifiers } from "@arkecosystem/core-contracts";
import Transactions from "@arkecosystem/core-crypto-transaction";
import { Utils as AppUtils } from "@arkecosystem/core-kernel";
import { injectable, inject } from "@arkecosystem/core-container";

import { Errors, Handlers } from "@arkecosystem/core-transactions";
import { MultiSignatureRegistrationTransaction } from "../versions";

@injectable()
export class MultiSignatureRegistrationTransactionHandler extends Handlers.TransactionHandler {
	@inject(Identifiers.TransactionPoolQuery)
	private readonly poolQuery: Contracts.TransactionPool.Query;

	@inject(Identifiers.TransactionHistoryService)
	private readonly transactionHistoryService: Contracts.Shared.TransactionHistoryService;

	@inject(Identifiers.Cryptography.Identity.AddressFactory)
	private readonly addressFactory: Crypto.IAddressFactory;

	@inject(Identifiers.Cryptography.Identity.PublicKeyFactory)
	private readonly publicKeyFactory: Crypto.IPublicKeyFactory;

	public dependencies(): ReadonlyArray<Handlers.TransactionHandlerConstructor> {
		return [];
	}

	public walletAttributes(): ReadonlyArray<string> {
		return ["multiSignature"];
	}

	public getConstructor(): Transactions.TransactionConstructor {
		return MultiSignatureRegistrationTransaction;
	}

	public async bootstrap(): Promise<void> {
		const criteria = {
			type: this.getConstructor().type,
			typeGroup: this.getConstructor().typeGroup,
			version: this.getConstructor().version,
		};

		for await (const transaction of this.transactionHistoryService.streamByCriteria(criteria)) {
			AppUtils.assert.defined<Crypto.IMultiSignatureAsset>(transaction.asset?.multiSignature);

			const multiSignature: Contracts.State.WalletMultiSignatureAttributes = transaction.asset.multiSignature;
			const wallet: Contracts.State.Wallet = await this.walletRepository.findByPublicKey(
				await this.publicKeyFactory.fromMultiSignatureAsset(multiSignature),
			);

			if (wallet.hasMultiSignature()) {
				throw new Errors.MultiSignatureAlreadyRegisteredError();
			}

			wallet.setAttribute("multiSignature", multiSignature);
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
		const { data }: Crypto.ITransaction = transaction;

		AppUtils.assert.defined<Crypto.IMultiSignatureAsset>(data.asset?.multiSignature);

		const { publicKeys, min } = data.asset.multiSignature;
		if (min < 1 || min > publicKeys.length || min > 16) {
			throw new Errors.MultiSignatureMinimumKeysError();
		}

		AppUtils.assert.defined<string[]>(data.signatures);

		if (publicKeys.length !== data.signatures.length) {
			throw new Errors.MultiSignatureKeyCountMismatchError();
		}

		AppUtils.assert.defined<Crypto.IMultiSignatureAsset>(data.asset.multiSignature);

		const multiSigPublicKey: string = await this.publicKeyFactory.fromMultiSignatureAsset(
			data.asset.multiSignature,
		);
		const recipientWallet: Contracts.State.Wallet = await this.walletRepository.findByPublicKey(multiSigPublicKey);

		if (recipientWallet.hasMultiSignature()) {
			throw new Errors.MultiSignatureAlreadyRegisteredError();
		}

		if (!this.verifySignatures(wallet, data, data.asset.multiSignature)) {
			throw new Errors.InvalidMultiSignatureError();
		}

		return super.throwIfCannotBeApplied(transaction, wallet);
	}

	public async throwIfCannotEnterPool(transaction: Crypto.ITransaction): Promise<void> {
		AppUtils.assert.defined<string>(transaction.data.senderPublicKey);
		AppUtils.assert.defined<Crypto.IMultiSignatureAsset>(transaction.data.asset?.multiSignature);

		const hasSender: boolean = this.poolQuery
			.getAllBySender(transaction.data.senderPublicKey)
			.whereKind(transaction)
			.has();

		if (hasSender) {
			throw new Contracts.TransactionPool.PoolError(
				`Sender ${transaction.data.senderPublicKey} already has a transaction of type '${Crypto.TransactionType.MultiSignature}' in the pool`,
				"ERR_PENDING",
			);
		}

		const address = await this.addressFactory.fromMultiSignatureAsset(transaction.data.asset.multiSignature);
		const hasAddress: boolean = this.poolQuery
			.getAll()
			.whereKind(transaction)
			.wherePredicate(
				async (t) =>
					(await this.addressFactory.fromMultiSignatureAsset(t.data.asset.multiSignature)) === address,
			)
			.has();

		if (hasAddress) {
			throw new Contracts.TransactionPool.PoolError(
				`MultiSignatureRegistration for address ${address} already in the pool`,
				"ERR_PENDING",
			);
		}
	}

	public async applyToSender(transaction: Crypto.ITransaction): Promise<void> {
		await super.applyToSender(transaction);
	}

	public async revertForSender(transaction: Crypto.ITransaction): Promise<void> {
		await super.revertForSender(transaction);
		// Nothing else to do for the sender since the recipient wallet
		// is made into a multi sig wallet.
	}

	public async applyToRecipient(transaction: Crypto.ITransaction): Promise<void> {
		const { data }: Crypto.ITransaction = transaction;

		AppUtils.assert.defined<Crypto.IMultiSignatureAsset>(data.asset?.multiSignature);

		const recipientWallet: Contracts.State.Wallet = await this.walletRepository.findByPublicKey(
			await this.publicKeyFactory.fromMultiSignatureAsset(data.asset.multiSignature),
		);

		recipientWallet.setAttribute("multiSignature", data.asset.multiSignature);
	}

	public async revertForRecipient(transaction: Crypto.ITransaction): Promise<void> {
		const { data }: Crypto.ITransaction = transaction;

		AppUtils.assert.defined<Crypto.IMultiSignatureAsset>(data.asset?.multiSignature);

		const recipientWallet: Contracts.State.Wallet = await this.walletRepository.findByPublicKey(
			await this.publicKeyFactory.fromMultiSignatureAsset(data.asset.multiSignature),
		);

		recipientWallet.forgetAttribute("multiSignature");
	}
}
