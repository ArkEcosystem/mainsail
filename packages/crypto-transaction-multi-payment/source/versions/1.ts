import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { extendSchema, Transaction, transactionBaseSchema } from "@mainsail/crypto-transaction";
import { Utils } from "@mainsail/kernel";
import { BigNumber, ByteBuffer } from "@mainsail/utils";

@injectable()
export class MultiPaymentTransaction extends Transaction {
	@inject(Identifiers.Application)
	public readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Cryptography.Identity.AddressSerializer)
	private readonly addressSerializer!: Contracts.Crypto.IAddressSerializer;

	@inject(Identifiers.Cryptography.Size.Address)
	private readonly addressSize!: number;

	public static typeGroup: number = Contracts.Crypto.TransactionTypeGroup.Core;
	public static type: number = Contracts.Crypto.TransactionType.MultiPayment;
	public static key = "multiPayment";

	public static getSchema(): Contracts.Crypto.ITransactionSchema {
		return extendSchema(transactionBaseSchema, {
			$id: "multiPayment",
			properties: {
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
				type: { transactionType: Contracts.Crypto.TransactionType.MultiPayment },
				vendorField: { anyOf: [{ type: "null" }, { format: "vendorField", type: "string" }] },
			},
		});
	}

	public hasVendorField(): boolean {
		return true;
	}

	public static getData(json: Contracts.Crypto.ITransactionJson): Contracts.Crypto.ITransactionData {
		const data = Transaction.getData(json);

		Utils.assert.defined<Contracts.Crypto.IMultiPaymentItem[]>(data.asset?.payments);

		for (const payment of data.asset.payments) {
			payment.amount = BigNumber.make(payment.amount);
		}

		return data;
	}

	public assetSize(): number {
		const { data } = this;
		Utils.assert.defined<Contracts.Crypto.IMultiPaymentItem[]>(data.asset?.payments);
		const { payments } = data.asset;

		return (
			2 + // number of payments
			payments.length * 8 + // amounts
			payments.length * this.addressSize // recipients
		);
	}

	public async serialize(options?: Contracts.Crypto.ISerializeOptions): Promise<ByteBuffer> {
		const { data } = this;

		Utils.assert.defined<Contracts.Crypto.IMultiPaymentItem[]>(data.asset?.payments);
		const { payments } = data.asset;

		const buff: ByteBuffer = ByteBuffer.fromSize(this.assetSize());

		buff.writeUint16(payments.length);

		for (const payment of payments) {
			buff.writeUint64(payment.amount.toBigInt());
			buff.writeBytes(await this.addressFactory.toBuffer(payment.recipientId));
		}

		return buff;
	}

	public async deserialize(buf: ByteBuffer): Promise<void> {
		const { data } = this;
		const payments: Contracts.Crypto.IMultiPaymentItem[] = [];
		const total: number = buf.readUint16();

		let totalPaymentsAmount = BigNumber.ZERO;
		for (let index = 0; index < total; index++) {
			const payment = {
				amount: BigNumber.make(buf.readUint64().toString()),
				recipientId: await this.addressFactory.fromBuffer(this.addressSerializer.deserialize(buf)),
			};

			totalPaymentsAmount = totalPaymentsAmount.plus(payment.amount);
			payments.push(payment);
		}

		data.amount = totalPaymentsAmount;
		data.asset = { payments };
	}
}
