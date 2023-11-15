import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { extendSchema, Transaction, transactionBaseSchema } from "@mainsail/crypto-transaction";
import { Utils } from "@mainsail/kernel";
import { ByteBuffer } from "@mainsail/utils";

@injectable()
export abstract class UsernameRegistrationTransaction extends Transaction {
	@inject(Identifiers.Cryptography.Size.PublicKey)
	@tagged("type", "consensus")
	private readonly publicKeySize!: number;

	public static typeGroup: number = Contracts.Crypto.TransactionTypeGroup.Core;
	public static type: number = Contracts.Crypto.TransactionType.ValidatorRegistration;
	public static key = "usernameRegistration";

	public static getSchema(): Contracts.Crypto.ITransactionSchema {
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
				fee: { bignumber: { bypassGenesis: true, minimum: 1 } },
				type: { transactionType: Contracts.Crypto.TransactionType.ValidatorRegistration },
			},
			required: ["asset"],
		});
	}

	public async serialize(options?: Contracts.Crypto.ISerializeOptions): Promise<ByteBuffer | undefined> {
		const { data, publicKeySize } = this;

		Utils.assert.defined<Contracts.Crypto.ITransactionAsset>(data.asset);
		Utils.assert.defined<string>(data.asset.validatorPublicKey);

		const buff: ByteBuffer = ByteBuffer.fromSize(publicKeySize);
		buff.writeBytes(Buffer.from(data.asset.validatorPublicKey, "hex"));

		return buff;
	}

	public async deserialize(buf: ByteBuffer): Promise<void> {
		const { data, publicKeySize } = this;

		data.asset = {
			validatorPublicKey: buf.readBytes(publicKeySize).toString("hex"),
		};
	}
}
