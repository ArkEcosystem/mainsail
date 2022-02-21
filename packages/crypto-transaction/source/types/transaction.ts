import { Container } from "@arkecosystem/container";
import { BINDINGS } from "@arkecosystem/crypto-contracts";

import { TransactionTypeGroup } from "../enums";
import { NotImplemented } from "../errors";
import { Address } from "@arkecosystem/crypto-identities";
import {
	ISchemaValidationResult,
	ISerializeOptions,
	ITransaction,
	ITransactionData,
	ITransactionJson,
} from "@arkecosystem/crypto-contracts";
import { BigNumber, ByteBuffer } from "@arkecosystem/utils";
import { Verifier } from "../verifier";
import { TransactionSchema } from "./schemas";
import { Configuration } from "@arkecosystem/crypto-config";

@Container.injectable()
export abstract class Transaction implements ITransaction {
	@Container.inject(BINDINGS.Configuration)
	protected readonly configuration: Configuration;

	@Container.inject(BINDINGS.Transaction.Verifier)
	private readonly verifier: Verifier;

	public static type: number | undefined = undefined;
	public static typeGroup: number | undefined = undefined;
	public static version = 1;
	public static key: string | undefined = undefined;

	protected static defaultStaticFee: BigNumber = BigNumber.ZERO;

	public isVerified = false;
	// @ts-ignore - todo: this is public but not initialised on creation, either make it private or declare it as undefined
	public data: ITransactionData;
	// @ts-ignore - todo: this is public but not initialised on creation, either make it private or declare it as undefined
	public serialized: Buffer;
	// @ts-ignore - todo: this is public but not initialised on creation, either make it private or declare it as undefined
	public timestamp: number;

	public static getSchema(): TransactionSchema {
		throw new NotImplemented();
	}

	public static staticFee(
		configuration: Configuration,
		feeContext: { height?: number; data?: ITransactionData } = {},
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

	public async verify(options?: ISerializeOptions): Promise<boolean> {
		return this.verifier.verify(this.data, options);
	}

	public verifySchema(): ISchemaValidationResult {
		return this.verifier.verifySchema(this.data);
	}

	public toJson(): ITransactionJson {
		const data: ITransactionJson = JSON.parse(JSON.stringify(this.data));

		if (data.typeGroup === TransactionTypeGroup.Core) {
			delete data.typeGroup;
		}

		if (data.version === 1) {
			delete data.nonce;
		} else {
			delete data.timestamp;
		}

		return data;
	}

	public toString(): string {
		const parts: string[] = [];

		if (this.data.senderPublicKey && this.data.nonce) {
			parts.push(
				`${Address.fromPublicKey(this.data.senderPublicKey, this.configuration.get("network"))}#${
					this.data.nonce
				}`,
			);
		} else if (this.data.senderPublicKey) {
			parts.push(`${Address.fromPublicKey(this.data.senderPublicKey, this.configuration.get("network"))}`);
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

	public abstract serialize(): ByteBuffer | undefined;
	public abstract deserialize(buf: ByteBuffer): void;

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
