import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { extendSchema, Transaction, transactionBaseSchema } from "@mainsail/crypto-transaction";
import { Utils } from "@mainsail/kernel";
import { ByteBuffer } from "@mainsail/utils";

@injectable()
export class EvmCallTransaction extends Transaction {
	@inject(Identifiers.Cryptography.Identity.Address.Serializer)
	private readonly addressSerializer!: Contracts.Crypto.AddressSerializer;

	@inject(Identifiers.Cryptography.Identity.Address.Size)
	private readonly addressSize!: number;

	public static typeGroup: number = Contracts.Crypto.TransactionTypeGroup.Core;
	public static type: number = Contracts.Crypto.TransactionType.EvmCall;
	public static key = "evmCall";

	public static getSchema(): Contracts.Crypto.TransactionSchema {
		return extendSchema(transactionBaseSchema, {
			$id: "evmCall",
			properties: {
				amount: { bignumber: { maximum: 0, minimum: 0 } },
				asset: {
					properties: {
						evmCall: {
							properties: {
								gasLimit: { minimum: 0, type: "integer" },
								payload: {
									// TODO: milestone for max allowed bytecode
									allOf: [{ maxLength: 1_000_000, minLength: 0 }, { $ref: "hex" }],
									type: "string",
								},
							},
							required: ["gasLimit", "payload"],
							type: "object",
							unevaluatedProperties: false,
						},
					},
					required: ["evmCall"],
					type: "object",
					unevaluatedProperties: false,
				},
				recipientId: { $ref: "address" },
				type: { transactionType: Contracts.Crypto.TransactionType.EvmCall },
			},
			required: ["recipientId", "asset"],
		});
	}

	public assetSize(): number {
		const { addressSize, data } = this;
		Utils.assert.defined<Contracts.Crypto.EvmCallAsset>(data.asset?.evmCall);
		const { evmCall } = data.asset;

		return (
			addressSize + // recipient
			4 + // gas limit
			4 + // payload length
			Buffer.byteLength(evmCall.payload, "hex")
		);
	}

	public async serialize(options?: Contracts.Crypto.SerializeOptions): Promise<ByteBuffer> {
		const { addressSize, addressFactory, addressSerializer, data } = this;

		Utils.assert.defined<Contracts.Crypto.TransactionAsset>(data.asset);
		Utils.assert.defined<number>(data.asset.evmCall?.gasLimit);
		Utils.assert.defined<string>(data.asset.evmCall?.payload);

		const payloadBytes = Buffer.from(data.asset.evmCall.payload, "hex");

		const buff: ByteBuffer = ByteBuffer.fromSize(addressSize + 4 + 4 + payloadBytes.byteLength);

		Utils.assert.defined<string>(data.recipientId);
		addressSerializer.serialize(buff, await addressFactory.toBuffer(data.recipientId));

		buff.writeUint32(data.asset.evmCall.gasLimit);
		buff.writeUint32(payloadBytes.byteLength);
		buff.writeBytes(payloadBytes);

		return buff;
	}

	public async deserialize(buf: ByteBuffer): Promise<void> {
		const { data, addressFactory, addressSerializer } = this;

		data.recipientId = await addressFactory.fromBuffer(addressSerializer.deserialize(buf));

		const gasLimit = buf.readUint32();
		const payloadLength = buf.readUint32();
		const payload = buf.readBytes(payloadLength);

		data.asset = {
			evmCall: {
				gasLimit,
				payload: payload.toString("hex"),
			},
		};
	}
}
