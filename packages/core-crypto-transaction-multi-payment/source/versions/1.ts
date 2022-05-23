import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { extendSchema, Transaction, transactionBaseSchema } from "@arkecosystem/core-crypto-transaction";
import { BigNumber, ByteBuffer } from "@arkecosystem/utils";

@injectable()
export class MultiPaymentTransaction extends Transaction {
	@inject(Identifiers.Application)
	public readonly app: Contracts.Kernel.Application;

	@inject(Identifiers.Cryptography.Identity.AddressSerializer)
	private readonly addressSerializer: Contracts.Crypto.IAddressSerializer;

	public static typeGroup: number = Contracts.Crypto.TransactionTypeGroup.Core;
	public static type: number = Contracts.Crypto.TransactionType.MultiPayment;
	public static key = "multiPayment";

	public static getSchema(): Contracts.Crypto.ITransactionSchema {
		return extendSchema(transactionBaseSchema, {
			$id: "multiPayment",
			properties: {
				amount: { bignumber: { maximum: 0, minimum: 0 } },
				asset: {
					properties: {
						payments: {
							items: {
								properties: {
									amount: { bignumber: { minimum: 1 } },
									recipientId: { $ref: "address" },
								},
								required: ["amount", "recipientId"],
								type: "object",
								unevaluatedProperties: false,
							},
							maxMultiPaymentLimit: {},
							minItems: 2,
							type: "array",
							uniqueItems: false,
						},
					},
					required: ["payments"],
					type: "object",
					unevaluatedProperties: false,
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
			const buff: ByteBuffer = ByteBuffer.fromSize(
				2 +
					data.asset.payments.length * this.app.get<number>(Identifiers.Cryptography.Size.Address) +
					data.asset.payments.length * 8,
			);
			buff.writeUint16(data.asset.payments.length);

			for (const payment of data.asset.payments) {
				buff.writeUint64(payment.amount.toBigInt());

				buff.writeBytes(await this.addressFactory.toBuffer(payment.recipientId));
			}

			return buff;
		}

		return undefined;
	}

	public async deserialize(buf: ByteBuffer): Promise<void> {
		const { data } = this;
		const payments: Contracts.Crypto.IMultiPaymentItem[] = [];
		const total: number = buf.readUint16();

		for (let index = 0; index < total; index++) {
			payments.push({
				amount: BigNumber.make(buf.readUint64().toString()),
				recipientId: await this.addressFactory.fromBuffer(this.addressSerializer.deserialize(buf)),
			});
		}

		data.amount = BigNumber.ZERO;
		data.asset = { payments };
	}
}
