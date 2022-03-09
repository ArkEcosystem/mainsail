import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { schemas, Transaction } from "@arkecosystem/core-crypto-transaction";
import { BigNumber, ByteBuffer } from "@arkecosystem/utils";

@injectable()
export class MultiPaymentTransaction extends Transaction {
	@inject(Identifiers.Cryptography.Identity.AddressSerializer)
	private readonly addressSerializer: Contracts.Crypto.IAddressSerializer;

	public static typeGroup: number = Contracts.Crypto.TransactionTypeGroup.Core;
	public static type: number = Contracts.Crypto.TransactionType.MultiPayment;
	public static key = "multiPayment";
	public static version = 1;

	protected static defaultStaticFee: BigNumber = BigNumber.make("10000000");

	public static getSchema(): schemas.TransactionSchema {
		return schemas.extend(schemas.transactionBaseSchema, {
			$id: "multiPayment",
			properties: {
				amount: { bignumber: { maximum: 0, minimum: 0 } },
				asset: {
					properties: {
						payments: {
							additionalItems: false,
							items: {
								properties: {
									amount: { bignumber: { minimum: 1 } },
									recipientId: { $ref: "address" },
								},
								required: ["amount", "recipientId"],
								type: "object",
							},
							minItems: 2,
							type: "array",
							uniqueItems: false,
						},
					},
					required: ["payments"],
					type: "object",
				},
				fee: { bignumber: { minimum: 1 } },
				type: { transactionType: Contracts.Crypto.TransactionType.MultiPayment },
				vendorField: { anyOf: [{ type: "null" }, { format: "vendorField", type: "string" }] },
			},
		});
	}

	public async serialize(options?: Contracts.Crypto.ISerializeOptions): Promise<ByteBuffer | undefined> {
		const { data } = this;

		if (data.asset && data.asset.payments) {
			const buff: ByteBuffer = new ByteBuffer(Buffer.alloc(2 + data.asset.payments.length * 29));
			buff.writeUInt16LE(data.asset.payments.length);

			for (const payment of data.asset.payments) {
				buff.writeBigUInt64LE(payment.amount.toBigInt());

				buff.writeBuffer(await this.addressFactory.toBuffer(payment.recipientId));
			}

			return buff;
		}

		return undefined;
	}

	public async deserialize(buf: ByteBuffer): Promise<void> {
		const { data } = this;
		const payments: Contracts.Crypto.IMultiPaymentItem[] = [];
		const total: number = buf.readUInt16LE();

		for (let index = 0; index < total; index++) {
			payments.push({
				amount: BigNumber.make(buf.readBigUInt64LE().toString()),
				recipientId: await this.addressFactory.fromBuffer(this.addressSerializer.deserialize(buf)),
			});
		}

		data.amount = BigNumber.ZERO;
		data.asset = { payments };
	}
}
