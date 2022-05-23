import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Exceptions, Identifiers } from "@arkecosystem/core-contracts";
import { ByteBuffer } from "@arkecosystem/utils";

@injectable()
export abstract class Transaction implements Contracts.Crypto.ITransaction {
	@inject(Identifiers.Cryptography.Identity.AddressFactory)
	protected readonly addressFactory: Contracts.Crypto.IAddressFactory;

	@inject(Identifiers.Cryptography.Configuration)
	protected readonly configuration: Contracts.Crypto.IConfiguration;

	public static type: number | undefined = undefined;
	public static typeGroup: number | undefined = undefined;
	public static version = 1;
	public static key: string | undefined = undefined;

	public data: Contracts.Crypto.ITransactionData;
	public serialized: Buffer;

	public get id(): string | undefined {
		return this.data.id;
	}

	public get type(): number {
		return this.data.type;
	}

	public get typeGroup(): number | undefined {
		return this.data.typeGroup;
	}

	public get key(): string {
		return (this as any).__proto__.constructor.key;
	}

	public static getSchema(): Contracts.Crypto.ITransactionSchema {
		throw new Exceptions.NotImplemented(this.constructor.name, "getSchema");
	}

	public hasVendorField(): boolean {
		return false;
	}

	public abstract serialize(): Promise<ByteBuffer | undefined>;
	public abstract deserialize(buf: ByteBuffer): Promise<void>;
}
