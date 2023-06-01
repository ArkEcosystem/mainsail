import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import Transactions from "@mainsail/crypto-transaction";
import { Utils as AppUtils } from "@mainsail/kernel";
import { Handlers } from "@mainsail/transactions";

import { MultiSignatureRegistrationTransaction } from "../versions";

@injectable()
export class MultiSignatureRegistrationTransactionHandler extends Handlers.TransactionHandler {
	@inject(Identifiers.TransactionPoolQuery)
	private readonly poolQuery!: Contracts.TransactionPool.Query;

	@inject(Identifiers.Cryptography.Identity.AddressFactory)
	private readonly addressFactory!: Contracts.Crypto.IAddressFactory;

	@inject(Identifiers.Cryptography.Identity.PublicKeyFactory)
	@tagged("type", "wallet")
	private readonly publicKeyFactory!: Contracts.Crypto.IPublicKeyFactory;

	public dependencies(): ReadonlyArray<Handlers.TransactionHandlerConstructor> {
		return [];
	}

	public walletAttributes(): ReadonlyArray<string> {
		return ["multiSignature"];
	}

	public getConstructor(): Transactions.TransactionConstructor {
		return MultiSignatureRegistrationTransaction;
	}

	public async bootstrap(
		walletRepository: Contracts.State.WalletRepository,
		transactions: Contracts.Crypto.ITransaction[],
	): Promise<void> {
		for (const transaction of this.allTransactions(transactions)) {
			AppUtils.assert.defined<Contracts.Crypto.IMultiSignatureAsset>(transaction.asset?.multiSignature);

			const multiSignature: Contracts.State.WalletMultiSignatureAttributes = transaction.asset.multiSignature;
			const wallet: Contracts.State.Wallet = await walletRepository.findByPublicKey(
				await this.publicKeyFactory.fromMultiSignatureAsset(multiSignature),
			);

			if (wallet.hasMultiSignature()) {
				throw new Exceptions.MultiSignatureAlreadyRegisteredError();
			}

			wallet.setAttribute("multiSignature", multiSignature);
			walletRepository.index(wallet);
		}
	}

	public async isActivated(): Promise<boolean> {
		return true;
	}

	public async throwIfCannotBeApplied(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.ITransaction,
		wallet: Contracts.State.Wallet,
	): Promise<void> {
		const { data }: Contracts.Crypto.ITransaction = transaction;

		AppUtils.assert.defined<Contracts.Crypto.IMultiSignatureAsset>(data.asset?.multiSignature);

		const { publicKeys, min } = data.asset.multiSignature;
		if (min < 1 || min > publicKeys.length || min > 16) {
			throw new Exceptions.MultiSignatureMinimumKeysError();
		}

		AppUtils.assert.defined<string[]>(data.signatures);

		if (publicKeys.length !== data.signatures.length) {
			throw new Exceptions.MultiSignatureKeyCountMismatchError();
		}

		AppUtils.assert.defined<Contracts.Crypto.IMultiSignatureAsset>(data.asset.multiSignature);

		const multiSigPublicKey: string = await this.publicKeyFactory.fromMultiSignatureAsset(
			data.asset.multiSignature,
		);
		const recipientWallet: Contracts.State.Wallet = await walletRepository.findByPublicKey(multiSigPublicKey);

		if (recipientWallet.hasMultiSignature()) {
			throw new Exceptions.MultiSignatureAlreadyRegisteredError();
		}

		if (!this.verifySignatures(wallet, data, data.asset.multiSignature)) {
			throw new Exceptions.InvalidMultiSignatureError();
		}

		return super.throwIfCannotBeApplied(walletRepository, transaction, wallet);
	}

	public async throwIfCannotEnterPool(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.ITransaction,
	): Promise<void> {
		AppUtils.assert.defined<string>(transaction.data.senderPublicKey);
		AppUtils.assert.defined<Contracts.Crypto.IMultiSignatureAsset>(transaction.data.asset?.multiSignature);

		const hasSender: boolean = await this.poolQuery
			.getAllBySender(transaction.data.senderPublicKey)
			.whereKind(transaction)
			.has();

		if (hasSender) {
			throw new Exceptions.PoolError(
				`Sender ${transaction.data.senderPublicKey} already has a transaction of type '${Contracts.Crypto.TransactionType.MultiSignature}' in the pool`,
				"ERR_PENDING",
			);
		}

		const address = await this.addressFactory.fromMultiSignatureAsset(transaction.data.asset.multiSignature);
		const hasAddress: boolean = await this.poolQuery
			.getAll()
			.whereKind(transaction)
			.wherePredicate(
				async (t) =>
					!!t.data.asset?.multiSignature &&
					(await this.addressFactory.fromMultiSignatureAsset(t.data.asset.multiSignature)) === address,
			)
			.has();

		if (hasAddress) {
			throw new Exceptions.PoolError(
				`MultiSignatureRegistration for address ${address} already in the pool`,
				"ERR_PENDING",
			);
		}
	}

	public async applyToSender(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.ITransaction,
	): Promise<void> {
		await super.applyToSender(walletRepository, transaction);
	}

	public async revertForSender(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.ITransaction,
	): Promise<void> {
		await super.revertForSender(walletRepository, transaction);
		// Nothing else to do for the sender since the recipient wallet
		// is made into a multi sig wallet.
	}

	public async applyToRecipient(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.ITransaction,
	): Promise<void> {
		const { data }: Contracts.Crypto.ITransaction = transaction;

		AppUtils.assert.defined<Contracts.Crypto.IMultiSignatureAsset>(data.asset?.multiSignature);

		const recipientWallet: Contracts.State.Wallet = await walletRepository.findByPublicKey(
			await this.publicKeyFactory.fromMultiSignatureAsset(data.asset.multiSignature),
		);

		recipientWallet.setAttribute("multiSignature", data.asset.multiSignature);
	}

	public async revertForRecipient(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.ITransaction,
	): Promise<void> {
		const { data }: Contracts.Crypto.ITransaction = transaction;

		AppUtils.assert.defined<Contracts.Crypto.IMultiSignatureAsset>(data.asset?.multiSignature);

		const recipientWallet: Contracts.State.Wallet = await walletRepository.findByPublicKey(
			await this.publicKeyFactory.fromMultiSignatureAsset(data.asset.multiSignature),
		);

		recipientWallet.forgetAttribute("multiSignature");
	}
}
