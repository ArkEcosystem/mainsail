import { Container } from "@arkecosystem/core-container";
import {
	IConfiguration,
	IMultiSignatureAsset,
	ISerializeOptions,
	ITransactionData,
	TransactionType,
	TransactionTypeGroup,
} from "@arkecosystem/core-crypto-contracts";
import { schemas, Transaction } from "@arkecosystem/core-crypto-transaction";
import { BigNumber, ByteBuffer } from "@arkecosystem/utils";

@Container.injectable()
export class MultiSignatureRegistrationTransaction extends Transaction {
	public static typeGroup: number = TransactionTypeGroup.Core;
	public static type: number = TransactionType.MultiSignature;
	public static key = "multiSignature";
	public static version = 1;

	protected static defaultStaticFee: BigNumber = BigNumber.make("500000000");

	public static getSchema(): schemas.TransactionSchema {
		return schemas.extend(schemas.transactionBaseSchema, {
			$id: "multiSignature",
			properties: {
				amount: { bignumber: { maximum: 0, minimum: 0 } },
				asset: {
					properties: {
						multiSignature: {
							properties: {
								min: {
									maximum: { $data: "1/publicKeys/length" },
									minimum: 1,
									type: "integer",
								},
								publicKeys: {
									additionalItems: false,
									items: { $ref: "publicKey" },
									maxItems: 16,
									minItems: 1,
									type: "array",
									uniqueItems: true,
								},
							},
							required: ["min", "publicKeys"],
							type: "object",
						},
					},
					required: ["multiSignature"],
					type: "object",
				},
				fee: { bignumber: { minimum: 1 } },
				signatures: {
					additionalItems: false,
					items: { allOf: [{ maxLength: 130, minLength: 130 }, { $ref: "alphanumeric" }] },
					maxItems: { $data: "1/asset/multiSignature/publicKeys/length" },
					minItems: { $data: "1/asset/multiSignature/min" },
					type: "array",
					uniqueItems: true,
				},
				type: { transactionType: TransactionType.MultiSignature },
			},
			required: ["asset", "signatures"],
		});
	}

	public static staticFee(
		configuration: IConfiguration,
		feeContext: { height?: number; data?: ITransactionData } = {},
	): BigNumber {
		if (feeContext.data?.asset?.multiSignature) {
			return super
				.staticFee(configuration, feeContext)
				.times(feeContext.data.asset.multiSignature.publicKeys.length + 1);
		}

		return super.staticFee(configuration, feeContext);
	}

	public async serialize(options?: ISerializeOptions): Promise<ByteBuffer | undefined> {
		const { data } = this;
		const { min, publicKeys } = data.asset.multiSignature;
		const buff: ByteBuffer = new ByteBuffer(Buffer.alloc(2 + publicKeys.length * 32));

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
			const publicKey = buf.readBuffer(32).toString("hex");
			multiSignature.publicKeys.push(publicKey);
		}

		data.asset = { multiSignature };
	}
}
