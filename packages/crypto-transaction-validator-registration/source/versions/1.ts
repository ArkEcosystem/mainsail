import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { extendSchema, Transaction, transactionBaseSchema } from "@mainsail/crypto-transaction";
import { Utils } from "@mainsail/kernel";
import { ByteBuffer } from "@mainsail/utils";

@injectable()
export abstract class ValidatorRegistrationTransaction extends Transaction {
	@inject(Identifiers.Cryptography.Size.PublicKey)
	@tagged("type", "consensus")
	private readonly publicKeySize!: number;

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
								publicKey: { $ref: "consensusPublicKey" },
								username: { $ref: "validatorUsername" },
							},
							required: ["username", "publicKey"],
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
		const { data, publicKeySize } = this;

		Utils.assert.defined<Contracts.Crypto.ITransactionData>(data.asset);
		Utils.assert.defined<{ username: string; publicKey: string }>(data.asset.validator);

		const validatorBytes: Buffer = Buffer.from(data.asset.validator.username, "utf8");
		const buff: ByteBuffer = ByteBuffer.fromSize(validatorBytes.length + 1 + publicKeySize);

		buff.writeUint8(validatorBytes.length);
		buff.writeBytes(validatorBytes);
		buff.writeBytes(Buffer.from(data.asset.validator.publicKey, "hex"));

		return buff;
	}

	public async deserialize(buf: ByteBuffer): Promise<void> {
		const { data, publicKeySize } = this;
		const usernameLength = buf.readUint8();

		data.asset = {
			validator: {
				username: buf.readBytes(usernameLength).toString("utf8"),
				// eslint-disable-next-line sort-keys-fix/sort-keys-fix
				publicKey: buf.readBytes(publicKeySize).toString("hex"),
			},
		};
	}
}
