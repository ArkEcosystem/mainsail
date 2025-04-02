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
	protected readonly utils!: Contracts.Crypto.TransactionUtilities;

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
		this.data.from = senderAddress;

		return this.instance();
	}

	public recipientAddress(recipientAddress: string): TBuilder {
		this.data.to = recipientAddress;

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

	public async legacySecondSign(passphrase: string): Promise<TBuilder> {
		return this.#legacySecondSignWithKeyPair(await this.keyPairFactory.fromMnemonic(passphrase));
	}

	public async legacySecondSignWithKeyPair(keys: Contracts.Crypto.KeyPair): Promise<TBuilder> {
		return this.#legacySecondSignWithKeyPair(keys);
	}

	public async legacySecondsignWithWif(wif: string): Promise<TBuilder> {
		return this.#legacySecondSignWithKeyPair(await this.keyPairFactory.fromWIF(wif));
	}

	public async verify(): Promise<boolean> {
		return this.verifier.verifyHash(this.data);
	}

	public async getStruct(): Promise<Contracts.Crypto.TransactionData> {
		if (
			!this.data.from ||
			!this.data.senderPublicKey ||
			!this.data.r ||
			!this.data.s ||
			this.data.v === undefined
		) {
			throw new Exceptions.MissingTransactionSignatureError();
		}

		const struct: Contracts.Crypto.TransactionData = {
			from: this.data.from,
			gasPrice: this.data.gasPrice,
			hash: await this.utils.getHash(await this.build()),
			legacySecondSignature: this.data.legacySecondSignature,
			network: this.data.network,
			nonce: this.data.nonce,
			r: this.data.r,
			s: this.data.s,
			senderPublicKey: this.data.senderPublicKey,
			v: this.data.v,
		} as Contracts.Crypto.TransactionData;

		return struct;
	}

	async #signWithKeyPair(keys: Contracts.Crypto.KeyPair): Promise<TBuilder> {
		this.data.senderPublicKey = keys.publicKey;
		this.data.from = await this.addressFactory.fromPublicKey(keys.publicKey);

		if (this.signWithSenderAsRecipient) {
			this.data.to = this.data.from;
		}

		const data = this.#getSigningObject();
		const { error } = await this.verifier.verifySchema(data, false);
		if (error) {
			throw new Exceptions.ValidationFailed(error);
		}

		const signature = await this.signer.sign(data, keys);

		this.data.v = signature.v;
		this.data.r = signature.r;
		this.data.s = signature.s;

		return this.instance();
	}

	async #legacySecondSignWithKeyPair(keys: Contracts.Crypto.KeyPair): Promise<TBuilder> {
		const data = this.#getSigningObject();
		const { error } = await this.verifier.verifySchema(data, false);
		if (error) {
			throw new Exceptions.ValidationFailed(error);
		}

		const signature = await this.signer.legacySecondSign(data, keys);

		this.data.legacySecondSignature = signature;

		return this.instance();
	}

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
			network: this.configuration.get<number>("network.chainId"),
			nonce: BigNumber.ZERO,
		} as unknown as Contracts.Crypto.TransactionData;
	}

	protected abstract instance(): TBuilder;
}
