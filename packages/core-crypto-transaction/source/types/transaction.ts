import { inject, injectable } from "@arkecosystem/core-container";
import { Crypto, Identifiers } from "@arkecosystem/core-contracts";
import { BigNumber, ByteBuffer } from "@arkecosystem/utils";

import { NotImplemented } from "@arkecosystem/core-contracts";
import { TransactionSchema } from "./schemas";

@injectable()
export abstract class Transaction implements Crypto.ITransaction {
	@inject(Identifiers.Cryptography.Identity.AddressFactory)
	protected readonly addressFactory: Crypto.IAddressFactory;

	@inject(Identifiers.Cryptography.Configuration)
	protected readonly configuration: Crypto.IConfiguration;

	@inject(Identifiers.Cryptography.Transaction.Verifier)
	private readonly verifier: Crypto.ITransactionVerifier;

	public static type: number | undefined = undefined;
	public static typeGroup: number | undefined = undefined;
	public static version = 1;
	public static key: string | undefined = undefined;

	protected static defaultStaticFee: BigNumber = BigNumber.ZERO;

	public isVerified = false;
	// @ts-ignore - todo: this is public but not initialised on creation, either make it private or declare it as undefined
	public data: Crypto.ITransactionData;
	// @ts-ignore - todo: this is public but not initialised on creation, either make it private or declare it as undefined
	public serialized: Buffer;
	// @ts-ignore - todo: this is public but not initialised on creation, either make it private or declare it as undefined
	public timestamp: number;

	public static getSchema(): TransactionSchema {
		throw new NotImplemented(this.constructor.name, "getSchema");
	}

	public static staticFee(
		configuration: Crypto.IConfiguration,
		feeContext: { height?: number; data?: Crypto.ITransactionData } = {},
	): BigNumber {
		const milestones = configuration.getMilestone(feeContext.height);

		if (milestones.fees && milestones.fees.staticFees && this.key) {
			const fee: any = milestones.fees.staticFees[this.key];

			if (fee !== undefined) {
				return BigNumber.make(fee);
			}
		}

		return this.defaultStaticFee;
	}

	public async verify(): Promise<boolean> {
		return this.verifier.verifyHash(this.data);
	}

	public verifySchema(): Crypto.ISchemaValidationResult {
		return this.verifier.verifySchema(this.data);
	}

	public toJson(): Crypto.ITransactionJson {
		const data: Crypto.ITransactionJson = JSON.parse(JSON.stringify(this.data));

		if (data.typeGroup === Crypto.TransactionTypeGroup.Core) {
			delete data.typeGroup;
		}

		if (data.version === 1) {
			delete data.nonce;
		} else {
			delete data.timestamp;
		}

		return data;
	}

	public async toString(): Promise<string> {
		const parts: string[] = [];

		if (this.data.senderPublicKey && this.data.nonce) {
			parts.push(`${await this.addressFactory.fromPublicKey(this.data.senderPublicKey)}#${this.data.nonce}`);
		} else if (this.data.senderPublicKey) {
			parts.push(`${await this.addressFactory.fromPublicKey(this.data.senderPublicKey)}`);
		}

		if (this.data.id) {
			parts.push(this.data.id.slice(-8));
		}

		parts.push(`${this.key[0].toUpperCase()}${this.key.slice(1)} v${this.data.version}`);

		return parts.join(" ");
	}

	public hasVendorField(): boolean {
		return false;
	}

	public abstract serialize(): Promise<ByteBuffer | undefined>;
	public abstract deserialize(buf: ByteBuffer): Promise<void>;

	public get id(): string | undefined {
		return this.data.id;
	}

	public get type(): number {
		return this.data.type;
	}

	public get typeGroup(): number | undefined {
		return this.data.typeGroup;
	}

	public get verified(): boolean {
		return this.isVerified;
	}

	public get key(): string {
		return (this as any).__proto__.constructor.key;
	}

	public get staticFee(): BigNumber {
		return (this as any).__proto__.constructor.staticFee(this.configuration, { data: this.data });
	}
}
