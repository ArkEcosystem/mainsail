import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { extendSchema, Transaction, transactionBaseSchema } from "@mainsail/crypto-transaction";
import { Utils } from "@mainsail/kernel";
import { ByteBuffer } from "@mainsail/utils";

@injectable()
export abstract class UsernameRegistrationTransaction extends Transaction {
	public static typeGroup: number = Contracts.Crypto.TransactionTypeGroup.Core;
	public static type: number = Contracts.Crypto.TransactionType.UsernameRegistration;
	public static key = "usernameRegistration";

	public static getSchema(): Contracts.Crypto.TransactionSchema {
		return extendSchema(transactionBaseSchema, {
			$id: "usernameRegistration",
			properties: {
				amount: { bignumber: { maximum: 0, minimum: 0 } },
				asset: {
					properties: {
						username: { $ref: "username" },
					},
					required: ["username"],
					type: "object",
					unevaluatedProperties: false,
				},
				type: { transactionType: Contracts.Crypto.TransactionType.UsernameRegistration },
			},
			required: ["asset"],
		});
	}

	public assetSize(): number {
		const { data } = this;

		Utils.assert.defined<Contracts.Crypto.TransactionAsset>(data.asset);
		Utils.assert.defined<string>(data.asset.username);

		return (
			1 + // length
			Buffer.byteLength(data.asset.username, "utf8")
		);
	}

	public async serialize(options?: Contracts.Crypto.SerializeOptions): Promise<ByteBuffer> {
		const { data } = this;

		Utils.assert.defined<Contracts.Crypto.TransactionAsset>(data.asset);
		Utils.assert.defined<string>(data.asset.username);

		const usernameBytes: Buffer = Buffer.from(data.asset.username, "utf8");
		const buff: ByteBuffer = ByteBuffer.fromSize(this.assetSize());

		buff.writeUint8(usernameBytes.length);
		buff.writeBytes(usernameBytes);

		return buff;
	}

	public async deserialize(buf: ByteBuffer): Promise<void> {
		const { data } = this;
		const usernameLength = buf.readUint8();

		data.asset = {
			username: buf.readBytes(usernameLength).toString("utf8"),
		};
	}
}
