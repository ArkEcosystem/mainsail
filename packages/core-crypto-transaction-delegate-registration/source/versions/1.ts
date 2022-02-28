import { Container } from "@arkecosystem/core-container";
import { ISerializeOptions, TransactionType, TransactionTypeGroup } from "@arkecosystem/core-crypto-contracts";
import { schemas, Transaction } from "@arkecosystem/core-crypto-transaction";
import { BigNumber, ByteBuffer } from "@arkecosystem/utils";

@Container.injectable()
export abstract class DelegateRegistrationTransaction extends Transaction {
	public static typeGroup: number = TransactionTypeGroup.Core;
	public static type: number = TransactionType.DelegateRegistration;
	public static key = "delegateRegistration";
	public static version = 1;

	protected static defaultStaticFee: BigNumber = BigNumber.make("2500000000");

	public static getSchema(): schemas.TransactionSchema {
		return schemas.extend(schemas.transactionBaseSchema, {
			$id: "delegateRegistration",
			properties: {
				amount: { bignumber: { maximum: 0, minimum: 0 } },
				asset: {
					properties: {
						delegate: {
							properties: {
								username: { $ref: "delegateUsername" },
							},
							required: ["username"],
							type: "object",
						},
					},
					required: ["delegate"],
					type: "object",
				},
				fee: { bignumber: { bypassGenesis: true, minimum: 1 } },
				type: { transactionType: TransactionType.DelegateRegistration },
			},
			required: ["asset"],
		});
	}

	public async serialize(options?: ISerializeOptions): Promise<ByteBuffer | undefined> {
		const { data } = this;

		if (data.asset && data.asset.delegate) {
			const delegateBytes: Buffer = Buffer.from(data.asset.delegate.username, "utf8");
			const buff: ByteBuffer = new ByteBuffer(Buffer.alloc(delegateBytes.length + 1));

			buff.writeUInt8(delegateBytes.length);
			// buffer.writeBuffer(delegateBytes, "hex");
			buff.writeBuffer(delegateBytes);

			return buff;
		}

		return undefined;
	}

	public async deserialize(buf: ByteBuffer): Promise<void> {
		const { data } = this;
		const usernameLength = buf.readUInt8();

		data.asset = {
			delegate: {
				username: buf.readBuffer(usernameLength).toString("utf8"),
			},
		};
	}
}
