import { Container } from "@arkecosystem/core-container";
import { Configuration } from "@arkecosystem/core-crypto-config";
import {
	IMultiSignatureAsset,
	ISerializeOptions,
	ITransactionData,
	TransactionType,
	TransactionTypeGroup,
} from "@arkecosystem/core-crypto-contracts";
import { schemas, Transaction } from "@arkecosystem/core-crypto-transaction";
import { BigNumber, ByteBuffer } from "@arkecosystem/utils";

@Container.injectable()
export class Two extends Transaction {
	public static typeGroup: number = TransactionTypeGroup.Core;
	public static type: number = TransactionType.MultiSignature;
	public static key = "multiSignature";
	public static version = 2;

	protected static defaultStaticFee: BigNumber = BigNumber.make("500000000");

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
				type: { transactionType: TransactionType.MultiPayment },
				vendorField: { anyOf: [{ type: "null" }, { format: "vendorField", type: "string" }] },
			},
		});
	}

	public static staticFee(
		configuration: Configuration,
		feeContext: { height?: number; data?: ITransactionData } = {},
	): BigNumber {
		if (feeContext.data?.asset?.multiSignature) {
			return super
				.staticFee(configuration, feeContext)
				.times(feeContext.data.asset.multiSignature.publicKeys.length + 1);
		}

		return super.staticFee(configuration, feeContext);
	}

	public async verify(): Promise<boolean> {
		return this.configuration.getMilestone().aip11 && (await super.verify());
	}

	public async serialize(options?: ISerializeOptions): Promise<ByteBuffer | undefined> {
		const { data } = this;
		const { min, publicKeys } = data.asset.multiSignature;
		const buff: ByteBuffer = new ByteBuffer(Buffer.alloc(2 + publicKeys.length * 33));

		buff.writeUInt8(min);
		buff.writeUInt8(publicKeys.length);

		for (const publicKey of publicKeys) {
			buff.writeBuffer(Buffer.from(publicKey, "hex"));
		}

		return buff;
	}

	public async deserialize(buf: ByteBuffer): Promise<void> {
		const { data } = this;

		const multiSignature: IMultiSignatureAsset = { min: 0, publicKeys: [] };
		multiSignature.min = buf.readUInt8();

		const count = buf.readUInt8();
		for (let index = 0; index < count; index++) {
			const publicKey = buf.readBuffer(33).toString("hex");
			multiSignature.publicKeys.push(publicKey);
		}

		data.asset = { multiSignature };
	}
}
