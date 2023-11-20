import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { extendSchema, Transaction, transactionBaseSchema } from "@mainsail/crypto-transaction";
import { Utils } from "@mainsail/kernel";
import { BigNumber, ByteBuffer } from "@mainsail/utils";

@injectable()
export class TransferTransaction extends Transaction {
	@inject(Identifiers.Cryptography.Identity.AddressSerializer)
	private readonly addressSerializer!: Contracts.Crypto.IAddressSerializer;

	@inject(Identifiers.Cryptography.Size.Address)
	private readonly addressSize!: number;

	public static typeGroup: number = Contracts.Crypto.TransactionTypeGroup.Core;
	public static type: number = Contracts.Crypto.TransactionType.Transfer;
	public static key = "transfer";

	public static getSchema(): Contracts.Crypto.ITransactionSchema {
		return extendSchema(transactionBaseSchema, {
			$id: "transfer",
			properties: {
				expiration: { minimum: 0, type: "integer" },
				recipientId: { $ref: "address" },
				type: { transactionType: Contracts.Crypto.TransactionType.Transfer },
				vendorField: { anyOf: [{ type: "null" }, { format: "vendorField", type: "string" }] },
			},
			required: ["recipientId"],
		});
	}

	public hasVendorField(): boolean {
		return true;
	}

	public assetSize(): number {
		return (
			8 + // amount
			4 + // expiration
			this.addressSize // recipient
		);
	}

	public async serialize(options?: Contracts.Crypto.ISerializeOptions): Promise<ByteBuffer> {
		const { data } = this;
		const buff: ByteBuffer = ByteBuffer.fromSize(this.assetSize());
		buff.writeUint64(data.amount.toBigInt());
		buff.writeUint32(data.expiration || 0);

		Utils.assert.defined<string>(data.recipientId);

		this.addressSerializer.serialize(buff, await this.addressFactory.toBuffer(data.recipientId));

		return buff;
	}

	public async deserialize(buf: ByteBuffer): Promise<void> {
		const { data } = this;
		data.amount = BigNumber.make(buf.readUint64().toString());
		data.expiration = buf.readUint32();
		data.recipientId = await this.addressFactory.fromBuffer(this.addressSerializer.deserialize(buf));
	}
}
