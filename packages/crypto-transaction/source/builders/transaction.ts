import { TransactionFactory } from "../factory";
import { Utils } from "../utils";
import { Slots } from "@arkecosystem/crypto-time";
import { TransactionTypeGroup } from "../enums";
import { MissingTransactionSignatureError, VendorFieldLengthExceededError } from "../errors";
import { Address, Keys } from "@arkecosystem/crypto-identities";
import { IKeyPair, ITransaction, ITransactionData } from "@arkecosystem/crypto-contracts";
import { BigNumber } from "@arkecosystem/utils";
import { maxVendorFieldLength } from "../helpers";
import { Signer } from "../signer";
import { Verifier } from "../verifier";
import { Container } from "@arkecosystem/container";
import { BINDINGS } from "@arkecosystem/crypto-contracts";
import { Configuration } from "@arkecosystem/crypto-config";

@Container.injectable()
export abstract class TransactionBuilder<TBuilder extends TransactionBuilder<TBuilder>> {
	@Container.inject(BINDINGS.Configuration)
	protected readonly configuration: Configuration;

	@Container.inject(BINDINGS.Transaction.Factory)
	protected readonly factory: TransactionFactory;

	@Container.inject(BINDINGS.Transaction.Signer)
	protected readonly signer: Signer;

	@Container.inject(BINDINGS.Transaction.Utils)
	protected readonly utils: Utils;

	@Container.inject(BINDINGS.Transaction.Verifier)
	protected readonly verifier: Verifier;

	public data: ITransactionData;

	protected signWithSenderAsRecipient = false;

	private disableVersionCheck = false;

	public constructor() {
		this.data = {
			id: undefined,
			timestamp: new Slots(this.configuration, {}).getTime(),
			typeGroup: TransactionTypeGroup.Test,
			nonce: BigNumber.ZERO,
			version: this.configuration.getMilestone().aip11 ? 0x02 : 0x01,
		} as ITransactionData;
	}

	public async build(data: Partial<ITransactionData> = {}): Promise<ITransaction> {
		return this.factory.fromData({ ...this.data, ...data }, false, {
			disableVersionCheck: this.disableVersionCheck,
		});
	}

	public version(version: number): TBuilder {
		this.data.version = version;
		this.disableVersionCheck = true;
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
		const limit: number = maxVendorFieldLength(this.configuration);

		if (vendorField) {
			if (Buffer.from(vendorField).length > limit) {
				throw new VendorFieldLengthExceededError(limit);
			}

			this.data.vendorField = vendorField;
		}

		return this.instance();
	}

	public timestamp(timestamp: number): TBuilder {
		this.data.timestamp = timestamp;

		return this.instance();
	}

	public async sign(passphrase: string): Promise<TBuilder> {
		const keys: IKeyPair = Keys.fromPassphrase(passphrase);
		return this.signWithKeyPair(keys);
	}

	public async signWithWif(wif: string, networkWif?: number): Promise<TBuilder> {
		const keys: IKeyPair = Keys.fromWIF(wif, {
			wif: networkWif || this.configuration.get("network.wif"),
		} as any);

		return this.signWithKeyPair(keys);
	}

	public multiSign(passphrase: string, index: number): TBuilder {
		const keys: IKeyPair = Keys.fromPassphrase(passphrase);
		return this.multiSignWithKeyPair(index, keys);
	}

	public multiSignWithWif(index: number, wif: string, networkWif?: number): TBuilder {
		const keys = Keys.fromWIF(wif, {
			wif: networkWif || this.configuration.get("network.wif"),
		} as any);

		return this.multiSignWithKeyPair(index, keys);
	}

	public async verify(): Promise<boolean> {
		return this.verifier.verifyHash(this.data, this.disableVersionCheck);
	}

	public async getStruct(): Promise<ITransactionData> {
		if (!this.data.senderPublicKey || (!this.data.signature && !this.data.signatures)) {
			throw new MissingTransactionSignatureError();
		}

		const struct: ITransactionData = {
			id: (await this.utils.getId(this.data)).toString(),
			signature: this.data.signature,
			version: this.data.version,
			type: this.data.type,
			fee: this.data.fee,
			senderPublicKey: this.data.senderPublicKey,
			network: this.data.network,
		} as ITransactionData;

		if (this.data.version === 1) {
			struct.timestamp = this.data.timestamp;
		} else {
			struct.typeGroup = this.data.typeGroup;
			struct.nonce = this.data.nonce;
		}

		if (Array.isArray(this.data.signatures)) {
			struct.signatures = this.data.signatures;
		}

		return struct;
	}

	private async signWithKeyPair(keys: IKeyPair): Promise<TBuilder> {
		this.data.senderPublicKey = keys.publicKey;

		if (this.signWithSenderAsRecipient) {
			this.data.recipientId = Address.fromPublicKey(keys.publicKey, { pubKeyHash: this.data.network });
		}

		this.data.signature = await this.signer.sign(this.getSigningObject(), keys, {
			disableVersionCheck: this.disableVersionCheck,
		});

		return this.instance();
	}

	private multiSignWithKeyPair(index: number, keys: IKeyPair): TBuilder {
		if (!this.data.signatures) {
			this.data.signatures = [];
		}

		this.version(2);
		this.signer.multiSign(this.getSigningObject(), keys, index);

		return this.instance();
	}

	private getSigningObject(): ITransactionData {
		const data: ITransactionData = {
			...this.data,
		};

		for (const key of Object.keys(data)) {
			if (["model", "network", "id"].includes(key)) {
				delete data[key];
			}
		}

		return data;
	}

	protected abstract instance(): TBuilder;
}
