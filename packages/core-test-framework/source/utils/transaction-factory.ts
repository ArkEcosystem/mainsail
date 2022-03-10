import { inject } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Utils as AppUtils } from "@arkecosystem/core-kernel";
import { BigNumber } from "@arkecosystem/utils";

import { MultiPaymentBuilder } from "../../../core-crypto-transaction-multi-payment";
import { MultiSignatureBuilder } from "../../../core-crypto-transaction-multi-signature-registration";
import { TransferBuilder } from "../../../core-crypto-transaction-transfer";
import { ValidatorRegistrationBuilder } from "../../../core-crypto-transaction-validator-registration";
import { ValidatorResignationBuilder } from "../../../core-crypto-transaction-validator-resignation";
import { VoteBuilder } from "../../../core-crypto-transaction-vote";
import secrets from "../internal/passphrases.json";
import { getWalletNonce } from "./generic";

const defaultPassphrase: string = secrets[0];

interface IPassphrasePair {
	passphrase: string;
}

// @TODO replace this by the use of real factories
export class TransactionFactory {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.Cryptography.Identity.AddressFactory)
	private readonly addressFactory: Contracts.Crypto.IAddressFactory;

	@inject(Identifiers.Cryptography.Identity.PublicKeyFactory)
	private readonly publicKeyFactory: Contracts.Crypto.IPublicKeyFactory;

	protected builder: any;
	protected app: Contracts.Kernel.Application;

	// @ts-ignore
	private network = "testnet";
	private networkConfig: Contracts.Crypto.NetworkConfig | undefined;
	private nonce: BigNumber | undefined;
	private fee: BigNumber | undefined;
	private passphrase: string = defaultPassphrase;
	private passphraseList: string[] | undefined;
	private passphrasePairs: IPassphrasePair[] | undefined;
	private version: number | undefined;
	private senderPublicKey: string | undefined;
	private expiration: number | undefined;
	private vendorField: string | undefined;

	protected constructor(app?: Contracts.Kernel.Application) {
		// @ts-ignore - this is only needed because of the "getNonce"
		// method so we don't care if it is undefined in certain scenarios
		this.app = app;
	}

	public static initialize(app?: Contracts.Kernel.Application): TransactionFactory {
		return new TransactionFactory(app);
	}

	public async transfer(
		recipientId?: string,
		amount: number = 2 * 1e8,
		vendorField?: string,
	): Promise<TransactionFactory> {
		const builder = new TransferBuilder()
			.amount(BigNumber.make(amount).toFixed())
			.recipientId(recipientId || (await this.addressFactory.fromMnemonic(defaultPassphrase)));

		if (vendorField) {
			builder.vendorField(vendorField);
		}

		this.builder = builder;

		return this;
	}

	public validatorRegistration(username?: string): TransactionFactory {
		const builder = new ValidatorRegistrationBuilder();

		if (username) {
			builder.usernameAsset(username);
		}

		this.builder = builder;

		return this;
	}

	public validatorResignation(): TransactionFactory {
		this.builder = new ValidatorResignationBuilder();

		return this;
	}

	public vote(publicKey?: string): TransactionFactory {
		this.builder = new VoteBuilder().votesAsset([
			`+${publicKey || this.publicKeyFactory.fromMnemonic(defaultPassphrase)}`,
		]);

		return this;
	}

	public unvote(publicKey?: string): TransactionFactory {
		this.builder = new VoteBuilder().votesAsset([
			`-${publicKey || this.publicKeyFactory.fromMnemonic(defaultPassphrase)}`,
		]);

		return this;
	}

	public async multiSignature(participants?: string[], min?: number): Promise<TransactionFactory> {
		let passphrases: string[] | undefined;
		if (!participants) {
			passphrases = [secrets[0], secrets[1], secrets[2]];
		}

		participants = participants || [
			await this.publicKeyFactory.fromMnemonic(secrets[0]),
			await this.publicKeyFactory.fromMnemonic(secrets[1]),
			await this.publicKeyFactory.fromMnemonic(secrets[2]),
		];

		this.builder = new MultiSignatureBuilder().multiSignatureAsset({
			min: min || participants.length,
			publicKeys: participants,
		});

		if (passphrases) {
			this.withPassphraseList(passphrases);
		}

		this.withSenderPublicKey(participants[0]);

		return this;
	}

	public multiPayment(payments: Array<{ recipientId: string; amount: string }>): TransactionFactory {
		const builder = new MultiPaymentBuilder();

		for (const payment of payments) {
			builder.addPayment(payment.recipientId, payment.amount);
		}

		this.builder = builder;

		return this;
	}

	public withFee(fee: number): TransactionFactory {
		this.fee = BigNumber.make(fee);

		return this;
	}

	public withNetwork(network: string): TransactionFactory {
		this.network = network;

		return this;
	}

	public withNetworkConfig(networkConfig: Contracts.Crypto.NetworkConfig): TransactionFactory {
		this.networkConfig = networkConfig;

		return this;
	}

	public withHeight(height: number): TransactionFactory {
		this.configuration.setHeight(height);

		return this;
	}

	public withSenderPublicKey(sender: string): TransactionFactory {
		this.senderPublicKey = sender;

		return this;
	}

	public withNonce(nonce: BigNumber): TransactionFactory {
		this.nonce = nonce;

		return this;
	}

	public withExpiration(expiration: number): TransactionFactory {
		this.expiration = expiration;

		return this;
	}

	public withVersion(version: number): TransactionFactory {
		this.version = version;

		return this;
	}

	public withVendorField(vendorField: string): TransactionFactory {
		this.vendorField = vendorField;

		return this;
	}

	public withPassphrase(passphrase: string): TransactionFactory {
		this.passphrase = passphrase;

		return this;
	}

	public withPassphraseList(passphrases: string[]): TransactionFactory {
		this.passphraseList = passphrases;

		return this;
	}

	public withPassphrasePair(passphrases: IPassphrasePair): TransactionFactory {
		this.passphrase = passphrases.passphrase;

		return this;
	}

	public withPassphrasePairs(passphrases: IPassphrasePair[]): TransactionFactory {
		this.passphrasePairs = passphrases;

		return this;
	}

	public async create(quantity = 1): Promise<Contracts.Crypto.ITransactionData[]> {
		return this.make<Contracts.Crypto.ITransactionData>(quantity, "getStruct");
	}

	public async createOne(): Promise<Contracts.Crypto.ITransactionData> {
		return (await this.create(1))[0];
	}

	public async build(quantity = 1): Promise<Contracts.Crypto.ITransaction[]> {
		return this.make<Contracts.Crypto.ITransaction>(quantity, "build");
	}

	public async getNonce(): Promise<BigNumber> {
		if (this.nonce) {
			return this.nonce;
		}

		AppUtils.assert.defined<string>(this.senderPublicKey);

		return getWalletNonce(this.app, this.senderPublicKey);
	}

	private async make<T>(quantity = 1, method: string): Promise<T[]> {
		if (this.passphrasePairs && this.passphrasePairs.length > 0) {
			return this.passphrasePairs.map(
				(passphrasePair: IPassphrasePair) =>
					this.withPassphrase(passphrasePair.passphrase).sign<T>(quantity, method)[0],
			);
		}

		return this.sign<T>(quantity, method);
	}

	private async sign<T>(quantity: number, method: string): Promise<T[]> {
		this.configuration.setConfig(this.networkConfig);

		if (!this.senderPublicKey) {
			this.senderPublicKey = await this.publicKeyFactory.fromMnemonic(this.passphrase);
		}

		const transactions: T[] = [];
		let nonce = await this.getNonce();

		for (let index = 0; index < quantity; index++) {
			if (this.builder.constructor.name === "TransferBuilder") {
				// @FIXME: when we use any of the "withPassphrase*" methods the builder will
				// always remember the previous vendor field instead generating a new one on each iteration
				const vendorField: string = this.builder.data.vendorField;

				if (!vendorField || (vendorField && vendorField.startsWith("Test Transaction"))) {
					this.builder.vendorField(`Test Transaction ${index + 1}`);
				}
			}

			if (
				this.builder.constructor.name === "ValidatorRegistrationBuilder" && // @FIXME: when we use any of the "withPassphrase*" methods the builder will
				// always remember the previous username instead generating a new one on each iteration
				!this.builder.data.asset.validator.username
			) {
				this.builder = new ValidatorRegistrationBuilder().usernameAsset(this.getRandomUsername());
			}

			if (this.version) {
				this.builder.version(this.version);
			}

			if (this.builder.data.version > 1) {
				nonce = nonce.plus(1);
				this.builder.nonce(nonce);
			}

			if (this.fee) {
				this.builder.fee(this.fee.toFixed());
			}

			if (this.expiration) {
				this.builder.expiration(this.expiration);
			}

			if (this.vendorField) {
				this.builder.vendorField(this.vendorField);
			}

			this.builder.senderPublicKey(this.senderPublicKey);

			let sign = true;

			if (this.passphraseList && this.passphraseList.length > 0) {
				for (let index = 0; index < this.passphraseList.length; index++) {
					this.builder.multiSign(this.passphraseList[index], index);
				}

				sign = this.builder.constructor.name === "MultiSignatureBuilder";
			}

			if (sign) {
				this.builder.sign(this.passphrase);
			}

			transactions.push(this.builder[method]());
		}

		return transactions;
	}

	private getRandomUsername(): string {
		return Math.random().toString(36).toLowerCase();
	}
}
