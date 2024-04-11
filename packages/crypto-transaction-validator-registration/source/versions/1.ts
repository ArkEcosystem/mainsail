import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { extendSchema, Transaction, transactionBaseSchema } from "@mainsail/crypto-transaction";
import { Utils } from "@mainsail/kernel";
import { ByteBuffer } from "@mainsail/utils";

@injectable()
export abstract class ValidatorRegistrationTransaction extends Transaction {
	@inject(Identifiers.Cryptography.Identity.PublicKey.Size)
	@tagged("type", "consensus")
	private readonly publicKeySize!: number;

	public static typeGroup: number = Contracts.Crypto.TransactionTypeGroup.Core;
	public static type: number = Contracts.Crypto.TransactionType.ValidatorRegistration;
	public static key = "validatorRegistration";

	public static getSchema(): Contracts.Crypto.TransactionSchema {
		return extendSchema(transactionBaseSchema, {
			$id: "validatorRegistration",
			properties: {
				asset: {
					properties: {
						validatorPublicKey: { $ref: "consensusPublicKey" },
					},
					required: ["validatorPublicKey"],
					type: "object",
					unevaluatedProperties: false,
				},
				type: { transactionType: Contracts.Crypto.TransactionType.ValidatorRegistration },
			},
			required: ["asset"],
		});
	}

	public assetSize(): number {
		return this.publicKeySize;
	}

	public async serialize(options?: Contracts.Crypto.SerializeOptions): Promise<ByteBuffer> {
		const { data } = this;

		Utils.assert.defined<Contracts.Crypto.TransactionAsset>(data.asset);
		Utils.assert.defined<string>(data.asset.validatorPublicKey);

		const buff: ByteBuffer = ByteBuffer.fromSize(this.assetSize());
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
