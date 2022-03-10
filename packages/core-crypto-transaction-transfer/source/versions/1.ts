import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { schemas, Transaction } from "@arkecosystem/core-crypto-transaction";
import { BigNumber, ByteBuffer } from "@arkecosystem/utils";

@injectable()
export class TransferTransaction extends Transaction {
	@inject(Identifiers.Cryptography.Identity.AddressSerializer)
	private readonly addressSerializer: Contracts.Crypto.IAddressSerializer;

	public static typeGroup: number = Contracts.Crypto.TransactionTypeGroup.Core;
	public static type: number = Contracts.Crypto.TransactionType.Transfer;
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
				type: { transactionType: Contracts.Crypto.TransactionType.Transfer },
				vendorField: { anyOf: [{ type: "null" }, { format: "vendorField", type: "string" }] },
			},
			required: ["recipientId"],
		});
	}

	public hasVendorField(): boolean {
		return true;
	}

	public async serialize(options?: Contracts.Crypto.ISerializeOptions): Promise<ByteBuffer | undefined> {
		const { data } = this;
		const buff: ByteBuffer = ByteBuffer.fromSize(64);
		buff.writeUint64(data.amount.toBigInt());
		buff.writeUint32(data.expiration || 0);

		if (data.recipientId) {
			this.addressSerializer.serialize(buff, await this.addressFactory.toBuffer(data.recipientId));
		}

		return buff;
	}

	public async deserialize(buf: ByteBuffer): Promise<void> {
		const { data } = this;
		data.amount = BigNumber.make(buf.readUint64().toString());
		data.expiration = buf.readUint32();
		data.recipientId = await this.addressFactory.fromBuffer(this.addressSerializer.deserialize(buf));
	}
}
