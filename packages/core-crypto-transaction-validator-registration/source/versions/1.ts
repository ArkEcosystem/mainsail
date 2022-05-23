import { injectable } from "@arkecosystem/core-container";
import { Contracts } from "@arkecosystem/core-contracts";
import { extendSchema, Transaction, transactionBaseSchema } from "@arkecosystem/core-crypto-transaction";
import { ByteBuffer } from "@arkecosystem/utils";

@injectable()
export abstract class ValidatorRegistrationTransaction extends Transaction {
	public static typeGroup: number = Contracts.Crypto.TransactionTypeGroup.Core;
	public static type: number = Contracts.Crypto.TransactionType.ValidatorRegistration;
	public static key = "validatorRegistration";

	public static getSchema(): Contracts.Crypto.ITransactionSchema {
		return extendSchema(transactionBaseSchema, {
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
							unevaluatedProperties: false,
						},
					},
					required: ["validator"],
					type: "object",
					unevaluatedProperties: false,
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
