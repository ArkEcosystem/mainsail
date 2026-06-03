import type { Contracts, Utils } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable, postConstruct, tagged } from "@mainsail/container";
import { MissingTransactionSignatureError, ValidationFailed } from "@mainsail/exceptions";

import { TransactionFactory } from "./factory.js";

@injectable()
export class TransactionBuilder {
	@inject(Identifiers.Cryptography.Identity.Address.Factory)
	private readonly addressFactory!: Contracts.Crypto.AddressFactory;

	@inject(Identifiers.Cryptography.Configuration)
	protected readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Cryptography.Transaction.Factory)
	protected readonly factory!: TransactionFactory;

	@inject(Identifiers.Cryptography.Legacy.Identity.AddressFactory)
	private readonly legacyAddressFactory!: Contracts.Crypto.AddressFactory;

	@inject(Identifiers.Cryptography.Identity.KeyPair.Factory)
	@tagged("type", "wallet")
	private readonly keyPairFactory!: Contracts.Crypto.KeyPairFactory;

	@inject(Identifiers.Cryptography.Transaction.Signer)
	protected readonly signer!: Contracts.Crypto.TransactionSigner;

	@inject(Identifiers.Cryptography.Transaction.HashFactory)
	protected readonly hashFactory!: Contracts.Crypto.TransactionHashFactory;

	@inject(Identifiers.Cryptography.Transaction.Verifier)
	protected readonly verifier!: Contracts.Crypto.TransactionVerifier;

	public data!: Utils.Mutable<Contracts.Crypto.TransactionData>;

	@postConstruct()
	public postConstruct(): void {
		this.data = {
			data: "0x",
			from: "",
			gasLimit: 1_000_000,
			gasPrice: 5 * 1e9,
			hash: "",
			network: this.configuration.getNetwork().chainId,
			nonce: 0n,
			r: "",
			s: "",
			senderLegacyAddress: "",
			senderPublicKey: "",
			to: undefined,
			v: 0,
			value: 0n,
		};
	}

	public async build(data: Partial<Contracts.Crypto.TransactionData> = {}): Promise<Contracts.Crypto.Transaction> {
		const { hash: _, ...dataToCreate } = { ...this.data, ...data };
		return this.factory.fromData(dataToCreate);
	}

	public nonce(nonce: string): TransactionBuilder {
		if (nonce) {
			this.data.nonce = BigInt(nonce);
		}

		return this;
	}

	public network(network: number): TransactionBuilder {
		this.data.network = network;
		return this;
	}

	public gasPrice(gasPrice: number): TransactionBuilder {
		this.data.gasPrice = gasPrice;
		return this;
	}

	public gasLimit(gasLimit: number): TransactionBuilder {
		this.data.gasLimit = gasLimit;
		return this;
	}

	public value(value: string): TransactionBuilder {
		this.data.value = BigInt(value);
		return this;
	}

	public recipientAddress(recipientAddress: string): TransactionBuilder {
		this.data.to = recipientAddress;
		return this;
	}

	public payload(payload: string): TransactionBuilder {
		this.data.data = payload.startsWith("0x") ? payload : `0x${payload}`;
		return this;
	}

	public async sign(passphrase: string): Promise<TransactionBuilder> {
		return this.#signWithKeyPair(await this.keyPairFactory.fromMnemonic(passphrase));
	}

	public async signWithKeyPair(keys: Contracts.Crypto.KeyPair): Promise<TransactionBuilder> {
		return this.#signWithKeyPair(keys);
	}

	public async signWithWif(wif: string): Promise<TransactionBuilder> {
		return this.#signWithKeyPair(await this.keyPairFactory.fromWIF(wif));
	}

	public async legacySecondSign(passphrase: string): Promise<TransactionBuilder> {
		return this.#legacySecondSignWithKeyPair(await this.keyPairFactory.fromMnemonic(passphrase));
	}

	public async legacySecondSignWithKeyPair(keys: Contracts.Crypto.KeyPair): Promise<TransactionBuilder> {
		return this.#legacySecondSignWithKeyPair(keys);
	}

	public async legacySecondSignWithWif(wif: string): Promise<TransactionBuilder> {
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
			throw new MissingTransactionSignatureError();
		}

		const struct: Contracts.Crypto.TransactionData = {
			data: this.data.data,
			from: this.data.from,
			gasLimit: this.data.gasLimit,
			gasPrice: this.data.gasPrice,
			hash: await this.#getHash(),
			legacySecondSignature: this.data.legacySecondSignature,
			network: this.data.network,
			nonce: this.data.nonce,
			r: this.data.r,
			s: this.data.s,
			senderLegacyAddress: this.data.senderLegacyAddress,
			senderPublicKey: this.data.senderPublicKey,
			to: this.data.to,
			v: this.data.v,
			value: this.data.value,
		};

		return struct;
	}

	async #getHash(): Promise<string> {
		return (await this.hashFactory.toHash(this.data)).toString("hex");
	}

	async #signWithKeyPair(keys: Contracts.Crypto.KeyPair): Promise<TransactionBuilder> {
		this.data.senderPublicKey = keys.publicKey;
		this.data.from = await this.addressFactory.fromPublicKey(keys.publicKey);
		this.data.senderLegacyAddress = await this.legacyAddressFactory.fromPublicKey(keys.publicKey);

		const data = this.#getSigningObject();
		const { error } = await this.verifier.verifySchemaUnsigned(data);
		if (error) {
			throw new ValidationFailed(error);
		}

		const signature = await this.signer.sign(data, keys);

		this.data.v = signature.v;
		this.data.r = signature.r;
		this.data.s = signature.s;

		return this;
	}

	async #legacySecondSignWithKeyPair(keys: Contracts.Crypto.KeyPair): Promise<TransactionBuilder> {
		const data = this.#getSigningObject();
		const { error } = await this.verifier.verifySchemaUnsigned(data);
		if (error) {
			throw new ValidationFailed(error);
		}

		const signature = await this.signer.legacySecondSign(data, keys);

		this.data.legacySecondSignature = signature;

		return this;
	}

	#getSigningObject(): Contracts.Crypto.TransactionUnsignedSerializable {
		return {
			data: this.data.data,
			gasLimit: this.data.gasLimit,
			gasPrice: this.data.gasPrice,
			network: this.data.network,
			nonce: this.data.nonce,
			to: this.data.to,
			value: this.data.value,
		};
	}
}
