import { injectable } from "@arkecosystem/core-container";
import { Contracts } from "@arkecosystem/core-contracts";
import { schemas, Transaction } from "@arkecosystem/core-crypto-transaction";
import { BigNumber, ByteBuffer } from "@arkecosystem/utils";

@injectable()
export abstract class ValidatorRegistrationTransaction extends Transaction {
	public static typeGroup: number = Contracts.Crypto.TransactionTypeGroup.Core;
	public static type: number = Contracts.Crypto.TransactionType.ValidatorRegistration;
	public static key = "validatorRegistration";
	public static version = 1;

	protected static defaultStaticFee: BigNumber = BigNumber.make("2500000000");

	public static getSchema(): schemas.TransactionSchema {
		return schemas.extend(schemas.transactionBaseSchema, {
			$id: "validatorRegistration",
			properties: {
				amount: { bignumber: { maximum: 0, minimum: 0 } },
				asset: {
					properties: {
						validator: {
							properties: {
								username: { $ref: "validatorUsername" },
							},
							required: ["username"],
							type: "object",
						},
					},
					required: ["validator"],
					type: "object",
				},
				fee: { bignumber: { bypassGenesis: true, minimum: 1 } },
				type: { transactionType: Contracts.Crypto.TransactionType.ValidatorRegistration },
			},
			required: ["asset"],
		});
	}

	public async serialize(options?: Contracts.Crypto.ISerializeOptions): Promise<ByteBuffer | undefined> {
		const { data } = this;

		if (data.asset && data.asset.validator) {
			const validatorBytes: Buffer = Buffer.from(data.asset.validator.username, "utf8");
			const buff: ByteBuffer = ByteBuffer.fromSize(validatorBytes.length + 1);

			buff.writeUint8(validatorBytes.length);
			// buffer.writeBytes(validatorBytes, "hex");
			buff.writeBytes(validatorBytes);

			return buff;
		}

		return undefined;
	}

	public async deserialize(buf: ByteBuffer): Promise<void> {
		const { data } = this;
		const usernameLength = buf.readUint8();

		data.asset = {
			validator: {
				username: buf.readBytes(usernameLength).toString("utf8"),
			},
		};
	}
}
