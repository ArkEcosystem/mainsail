import { Container } from "@arkecosystem/core-container";
import { ISerializeOptions, TransactionType, TransactionTypeGroup } from "@arkecosystem/core-crypto-contracts";
import { schemas, Transaction } from "@arkecosystem/core-crypto-transaction";
import { BigNumber, ByteBuffer } from "@arkecosystem/utils";

@Container.injectable()
export class TransferTransaction extends Transaction {
	public static typeGroup: number = TransactionTypeGroup.Core;
	public static type: number = TransactionType.Transfer;
	public static key = "transfer";
	public static version = 1;

	protected static defaultStaticFee: BigNumber = BigNumber.make("10000000");

	public static getSchema(): schemas.TransactionSchema {
		return schemas.extend(schemas.transactionBaseSchema, {
			$id: "transfer",
			properties: {
				expiration: { minimum: 0, type: "integer" },
				fee: { bignumber: { bypassGenesis: true, minimum: 1 } },
				recipientId: { $ref: "address" },
				type: { transactionType: TransactionType.Transfer },
				vendorField: { anyOf: [{ type: "null" }, { format: "vendorField", type: "string" }] },
			},
			required: ["recipientId"],
		});
	}

	public hasVendorField(): boolean {
		return true;
	}

	public async serialize(options?: ISerializeOptions): Promise<ByteBuffer | undefined> {
		const { data } = this;
		const buff: ByteBuffer = new ByteBuffer(Buffer.alloc(64));
		buff.writeBigUInt64LE(data.amount.toBigInt());
		buff.writeUInt32LE(data.expiration || 0);

		if (data.recipientId) {
			const { addressBuffer } = await this.addressFactory.toBuffer(data.recipientId);

			buff.writeBuffer(addressBuffer);
		}

		return buff;
	}

	public async deserialize(buf: ByteBuffer): Promise<void> {
		const { data } = this;
		data.amount = BigNumber.make(buf.readBigUInt64LE().toString());
		data.expiration = buf.readUInt32LE();
		data.recipientId = await this.addressFactory.fromBuffer(buf.readBuffer(52)); // 52=bech32m, 21=base58
	}
}
