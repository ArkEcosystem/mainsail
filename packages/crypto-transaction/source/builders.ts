import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";

import { TransactionFactory } from "./factory.js";

@injectable()
export abstract class TransactionBuilder<TBuilder extends TransactionBuilder<TBuilder>> {
	@inject(Identifiers.Cryptography.Identity.Address.Factory)
	private readonly addressFactory!: Contracts.Crypto.AddressFactory;

	@inject(Identifiers.Cryptography.Configuration)
	protected readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Cryptography.Transaction.Factory)
	protected readonly factory!: TransactionFactory;

	@inject(Identifiers.Cryptography.Identity.KeyPair.Factory)
	@tagged("type", "wallet")
	private readonly keyPairFactory!: Contracts.Crypto.KeyPairFactory;

	@inject(Identifiers.Cryptography.Transaction.Signer)
	protected readonly signer!: Contracts.Crypto.TransactionSigner;

	@inject(Identifiers.Cryptography.Transaction.Utils)
	protected readonly utils!: Contracts.Crypto.TransactionUtils;

	@inject(Identifiers.Cryptography.Transaction.Verifier)
	protected readonly verifier!: Contracts.Crypto.TransactionVerifier;

	public data!: Contracts.Crypto.TransactionData;

	protected signWithSenderAsRecipient = false;

	public async build(data: Partial<Contracts.Crypto.TransactionData> = {}): Promise<Contracts.Crypto.Transaction> {
		return this.factory.fromData({ ...this.data, ...data }, false);
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

	public gasPrice(gasPrice: number): TBuilder {
		this.data.gasPrice = gasPrice;

		return this.instance();
	}

	public value(value: string): TBuilder {
		this.data.value = BigNumber.make(value);

		return this.instance();
	}

	public senderAddress(senderAddress: string): TBuilder {
		this.data.senderAddress = senderAddress;

		return this.instance();
	}

	public recipientAddress(recipientAddress: string): TBuilder {
		this.data.recipientAddress = recipientAddress;

		return this.instance();
	}

	public vendorField(vendorField: string): TBuilder {
		// const limit: number = this.configuration.getMilestone().vendorFieldLength;

		// if (vendorField) {
		// 	if (Buffer.byteLength(vendorField, "utf8") > limit) {
		// 		throw new Exceptions.VendorFieldLengthExceededError(limit);
		// 	}

		// 	this.data.vendorField = vendorField;
		// }

		return this.instance();
	}

	public async sign(passphrase: string): Promise<TBuilder> {
		return this.#signWithKeyPair(await this.keyPairFactory.fromMnemonic(passphrase));
	}

	public async signWithKeyPair(keys: Contracts.Crypto.KeyPair): Promise<TBuilder> {
		return this.#signWithKeyPair(keys);
	}

	public async signWithWif(wif: string): Promise<TBuilder> {
		return this.#signWithKeyPair(await this.keyPairFactory.fromWIF(wif));
	}

	// public async multiSign(passphrase: string, index: number): Promise<TBuilder> {
	// 	return this.#multiSignWithKeyPair(index, await this.keyPairFactory.fromMnemonic(passphrase));
	// }

	// public async multiSignWithKeyPair(keys: Contracts.Crypto.KeyPair, index: number): Promise<TBuilder> {
	// 	return this.#multiSignWithKeyPair(index, keys);
	// }

	// public async multiSignWithWif(index: number, wif: string): Promise<TBuilder> {
	// 	return this.#multiSignWithKeyPair(index, await this.keyPairFactory.fromWIF(wif));
	// }

	public async verify(): Promise<boolean> {
		return this.verifier.verifyHash(this.data);
	}

	public async getStruct(): Promise<Contracts.Crypto.TransactionData> {
		if (!this.data.senderAddress || !this.data.senderPublicKey || !this.data.signature) {
			throw new Exceptions.MissingTransactionSignatureError();
		}

		const struct: Contracts.Crypto.TransactionData = {
			id: await this.utils.getId(await this.build()),
			gasPrice: this.data.gasPrice,
			network: this.data.network,
			nonce: this.data.nonce,
			senderPublicKey: this.data.senderPublicKey,
			senderAddress: this.data.senderAddress,
			signature: this.data.signature,
			type: this.data.type,
		} as Contracts.Crypto.TransactionData;

		// if (Array.isArray(this.data.signatures)) {
		// 	struct.signatures = this.data.signatures;
		// }

		return struct;
	}

	async #signWithKeyPair(keys: Contracts.Crypto.KeyPair): Promise<TBuilder> {
		this.data.senderPublicKey = keys.publicKey;
		this.data.senderAddress = await this.addressFactory.fromPublicKey(keys.publicKey);

		if (this.signWithSenderAsRecipient) {
			this.data.recipientAddress = this.data.senderAddress;
		}

		const data = this.#getSigningObject();
		const { error } = await this.verifier.verifySchema(data, false);
		if (error) {
			throw new Exceptions.ValidationFailed(error);
		}

		this.data.signature = await this.signer.sign(data, keys);

		return this.instance();
	}

	// async #multiSignWithKeyPair(index: number, keys: Contracts.Crypto.KeyPair): Promise<TBuilder> {
	// 	if (!this.data.signatures) {
	// 		this.data.signatures = [];
	// 	}

	// 	await this.signer.multiSign(this.#getSigningObject(), keys, index);

	// 	return this.instance();
	// }

	#getSigningObject(): Contracts.Crypto.TransactionData {
		const data: Contracts.Crypto.TransactionData = {
			...this.data,
		};

		for (const key of Object.keys(data)) {
			if (["model", "id"].includes(key)) {
				delete data[key];
			}
		}

		return data;
	}

	protected initializeData() {
		this.data = {
			gasPrice: 0,
			id: undefined,
			nonce: BigNumber.ZERO,
		} as unknown as Contracts.Crypto.TransactionData;
	}

	protected abstract instance(): TBuilder;
}
