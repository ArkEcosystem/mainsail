import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { TransactionConstructor } from "@mainsail/crypto-transaction";
import { Utils as AppUtils } from "@mainsail/kernel";
import { Handlers } from "@mainsail/transactions";

import { MultiSignatureRegistrationTransaction } from "../versions/index.js";

@injectable()
export class MultiSignatureRegistrationTransactionHandler extends Handlers.TransactionHandler {
	@inject(Identifiers.TransactionPool.Query)
	private readonly poolQuery!: Contracts.TransactionPool.Query;

	@inject(Identifiers.Cryptography.Identity.Address.Factory)
	private readonly addressFactory!: Contracts.Crypto.AddressFactory;

	@inject(Identifiers.Cryptography.Identity.PublicKey.Factory)
	@tagged("type", "wallet")
	private readonly publicKeyFactory!: Contracts.Crypto.PublicKeyFactory;

	public dependencies(): ReadonlyArray<Handlers.TransactionHandlerConstructor> {
		return [];
	}

	public walletAttributes(): ReadonlyArray<{ name: string; type: Contracts.State.AttributeType }> {
		return [{ name: "multiSignature", type: Contracts.State.AttributeType.Object }];
	}

	public getConstructor(): TransactionConstructor {
		return MultiSignatureRegistrationTransaction;
	}

	public async isActivated(): Promise<boolean> {
		return true;
	}

	public async throwIfCannotBeApplied(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.Transaction,
		wallet: Contracts.State.Wallet,
	): Promise<void> {
		const { data }: Contracts.Crypto.Transaction = transaction;

		AppUtils.assert.defined<Contracts.Crypto.MultiSignatureAsset>(data.asset?.multiSignature);

		const { publicKeys, min } = data.asset.multiSignature;
		if (min < 1 || min > publicKeys.length || min > 16) {
			throw new Exceptions.MultiSignatureMinimumKeysError();
		}

		AppUtils.assert.defined<string[]>(data.signatures);

		if (publicKeys.length !== data.signatures.length) {
			throw new Exceptions.MultiSignatureKeyCountMismatchError();
		}

		AppUtils.assert.defined<Contracts.Crypto.MultiSignatureAsset>(data.asset.multiSignature);

		const multiSigPublicKey: string = await this.publicKeyFactory.fromMultiSignatureAsset(
			data.asset.multiSignature,
		);
		const recipientWallet: Contracts.State.Wallet = await walletRepository.findByPublicKey(multiSigPublicKey);

		if (recipientWallet.hasMultiSignature()) {
			throw new Exceptions.MultiSignatureAlreadyRegisteredError();
		}

		if (!(await this.verifySignatures(wallet, data, data.asset.multiSignature))) {
			throw new Exceptions.InvalidMultiSignatureError();
		}

		return super.throwIfCannotBeApplied(walletRepository, transaction, wallet);
	}

	public async throwIfCannotEnterPool(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.Transaction,
	): Promise<void> {
		AppUtils.assert.defined<string>(transaction.data.senderPublicKey);
		AppUtils.assert.defined<Contracts.Crypto.MultiSignatureAsset>(transaction.data.asset?.multiSignature);

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
		transaction: Contracts.Crypto.Transaction,
	): Promise<void> {
		await super.applyToSender(walletRepository, transaction);
	}

	public async applyToRecipient(
		walletRepository: Contracts.State.WalletRepository,
		transaction: Contracts.Crypto.Transaction,
	): Promise<void> {
		const { data }: Contracts.Crypto.Transaction = transaction;

		AppUtils.assert.defined<Contracts.Crypto.MultiSignatureAsset>(data.asset?.multiSignature);

		const recipientWallet: Contracts.State.Wallet = await walletRepository.findByPublicKey(
			await this.publicKeyFactory.fromMultiSignatureAsset(data.asset.multiSignature),
		);

		recipientWallet.setAttribute("multiSignature", data.asset.multiSignature);
	}
}
