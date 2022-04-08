import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Exceptions, Identifiers } from "@arkecosystem/core-contracts";
import { BigNumber } from "@arkecosystem/utils";

import { TransactionFactory } from "./factory";

@injectable()
export abstract class TransactionBuilder<TBuilder extends TransactionBuilder<TBuilder>> {
	@inject(Identifiers.Cryptography.Identity.AddressFactory)
	private readonly addressFactory: Contracts.Crypto.IAddressFactory;

	@inject(Identifiers.Cryptography.Configuration)
	protected readonly configuration: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.Cryptography.Transaction.Factory)
	protected readonly factory: TransactionFactory;

	@inject(Identifiers.Cryptography.Identity.KeyPairFactory)
	private readonly keyPairFactory: Contracts.Crypto.IKeyPairFactory;

	@inject(Identifiers.Cryptography.Transaction.Signer)
	protected readonly signer: Contracts.Crypto.ITransactionSigner;

	@inject(Identifiers.Cryptography.Transaction.Utils)
	protected readonly utils: Contracts.Crypto.ITransactionUtils;

	@inject(Identifiers.Cryptography.Transaction.Verifier)
	protected readonly verifier: Contracts.Crypto.ITransactionVerifier;

	public data: Contracts.Crypto.ITransactionData;

	protected signWithSenderAsRecipient = false;

	public async build(data: Partial<Contracts.Crypto.ITransactionData> = {}): Promise<Contracts.Crypto.ITransaction> {
		return this.factory.fromData({ ...this.data, ...data }, false);
	}

	public version(version: number): TBuilder {
		this.data.version = version;
		return this.instance();
	}

	public typeGroup(typeGroup: number): TBuilder {
		this.data.typeGroup = typeGroup;

		return this.instance();
	}

	public nonce(nonce: string): TBuilder {
		if (nonce) {
			this.data.nonce = BigNumber.make(nonce);
		}

		return this.instance();
	}

	public network(network: number): TBuilder {
		this.data.network = network;

		return this.instance();
	}

	public fee(fee: string): TBuilder {
		if (fee) {
			this.data.fee = BigNumber.make(fee);
		}

		return this.instance();
	}

	public amount(amount: string): TBuilder {
		this.data.amount = BigNumber.make(amount);

		return this.instance();
	}

	public recipientId(recipientId: string): TBuilder {
		this.data.recipientId = recipientId;

		return this.instance();
	}

	public senderPublicKey(publicKey: string): TBuilder {
		this.data.senderPublicKey = publicKey;

		return this.instance();
	}

	public vendorField(vendorField: string): TBuilder {
		const limit: number = this.configuration.getMilestone().vendorFieldLength;

		if (vendorField) {
			if (Buffer.from(vendorField).length > limit) {
				throw new Exceptions.VendorFieldLengthExceededError(limit);
			}

			this.data.vendorField = vendorField;
		}

		return this.instance();
	}

	public async sign(passphrase: string): Promise<TBuilder> {
		return this.#signWithKeyPair(await this.keyPairFactory.fromMnemonic(passphrase));
	}

	public async signWithWif(wif: string): Promise<TBuilder> {
		return this.#signWithKeyPair(await this.keyPairFactory.fromWIF(wif));
	}

	public async multiSign(passphrase: string, index: number): Promise<TBuilder> {
		return this.#multiSignWithKeyPair(index, await this.keyPairFactory.fromMnemonic(passphrase));
	}

	public async multiSignWithWif(index: number, wif: string): Promise<TBuilder> {
		return this.#multiSignWithKeyPair(index, await this.keyPairFactory.fromWIF(wif));
	}

	public async verify(): Promise<boolean> {
		return this.verifier.verifyHash(this.data);
	}

	public async getStruct(): Promise<Contracts.Crypto.ITransactionData> {
		if (!this.data.senderPublicKey || (!this.data.signature && !this.data.signatures)) {
			throw new Exceptions.MissingTransactionSignatureError();
		}

		const struct: Contracts.Crypto.ITransactionData = {
			fee: this.data.fee,
			id: await this.utils.getId(this.data),
			network: this.data.network,
			nonce: this.data.nonce,
			senderPublicKey: this.data.senderPublicKey,
			signature: this.data.signature,
			type: this.data.type,
			typeGroup: this.data.typeGroup,
			version: this.data.version,
		} as Contracts.Crypto.ITransactionData;

		if (Array.isArray(this.data.signatures)) {
			struct.signatures = this.data.signatures;
		}

		return struct;
	}

	async #signWithKeyPair(keys: Contracts.Crypto.IKeyPair): Promise<TBuilder> {
		this.data.senderPublicKey = keys.publicKey;

		if (this.signWithSenderAsRecipient) {
			this.data.recipientId = await this.addressFactory.fromPublicKey(keys.publicKey);
		}

		this.data.signature = await this.signer.sign(this.#getSigningObject(), keys);

		return this.instance();
	}

	async #multiSignWithKeyPair(index: number, keys: Contracts.Crypto.IKeyPair): Promise<TBuilder> {
		if (!this.data.signatures) {
			this.data.signatures = [];
		}

		await this.signer.multiSign(this.#getSigningObject(), keys, index);

		return this.instance();
	}

	#getSigningObject(): Contracts.Crypto.ITransactionData {
		const data: Contracts.Crypto.ITransactionData = {
			...this.data,
		};

		for (const key of Object.keys(data)) {
			if (["model", "network", "id"].includes(key)) {
				delete data[key];
			}
		}

		return data;
	}

	protected initializeData() {
		this.data = {
			id: undefined,
			nonce: BigNumber.ZERO,
			typeGroup: Contracts.Crypto.TransactionTypeGroup.Test,
			version: 0x01,
		} as Contracts.Crypto.ITransactionData;
	}

	protected abstract instance(): TBuilder;
}
