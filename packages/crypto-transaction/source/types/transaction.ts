import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { BigNumber, ByteBuffer } from "@mainsail/utils";

@injectable()
export abstract class Transaction implements Contracts.Crypto.Transaction {
	@inject(Identifiers.Cryptography.Identity.AddressFactory)
	protected readonly addressFactory!: Contracts.Crypto.AddressFactory;

	@inject(Identifiers.Cryptography.Configuration)
	protected readonly configuration!: Contracts.Crypto.Configuration;

	public static type: number | undefined = undefined;
	public static typeGroup: number | undefined = undefined;
	public static version = 1;
	public static key: string | undefined = undefined;

	public data!: Contracts.Crypto.TransactionData;
	public serialized!: Buffer;

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

	public static getSchema(): Contracts.Crypto.TransactionSchema {
		throw new Exceptions.NotImplemented(this.constructor.name, "getSchema");
	}

	public static getData(json: Contracts.Crypto.TransactionJson): Contracts.Crypto.TransactionData {
		const data: Contracts.Crypto.TransactionData = { ...json } as unknown as Contracts.Crypto.TransactionData;
		data.amount = BigNumber.make(data.amount);
		data.fee = BigNumber.make(data.fee);
		data.nonce = BigNumber.make(data.nonce);
		return data;
	}

	public hasVendorField(): boolean {
		return false;
	}

	public abstract assetSize(): number;
	public abstract serialize(): Promise<ByteBuffer>;
	public abstract deserialize(buf: ByteBuffer): Promise<void>;
}
