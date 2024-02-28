import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { extendSchema, Transaction, transactionBaseSchema } from "@mainsail/crypto-transaction";
import { Utils } from "@mainsail/kernel";
import { ByteBuffer } from "@mainsail/utils";

@injectable()
export class EvmCallTransaction extends Transaction {
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
								gasLimit: { type: "integer", minimum: 0 },
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
				type: { transactionType: Contracts.Crypto.TransactionType.EvmCall },
			},
		});
	}

	public assetSize(): number {
		const { data } = this;
		Utils.assert.defined<Contracts.Crypto.EvmCallAsset>(data.asset?.evmCall);
		const { evmCall } = data.asset;

		return (
			4 + // gas limit
			4 + // payload length
			Buffer.byteLength(evmCall.payload, "hex")
		);
	}

	public async serialize(options?: Contracts.Crypto.SerializeOptions): Promise<ByteBuffer> {
		const { data } = this;

		Utils.assert.defined<Contracts.Crypto.TransactionAsset>(data.asset);
		Utils.assert.defined<number>(data.asset.evmCall?.gasLimit);
		Utils.assert.defined<string>(data.asset.evmCall?.payload);

		const payloadBytes = Buffer.from(data.asset.evmCall.payload, "hex");

		const buff: ByteBuffer = ByteBuffer.fromSize(4 + 4 + payloadBytes.byteLength);

		buff.writeUint32(data.asset.evmCall.gasLimit);
		buff.writeUint32(payloadBytes.byteLength);
		buff.writeBytes(payloadBytes);

		return buff;
	}

	public async deserialize(buf: ByteBuffer): Promise<void> {
		const { data } = this;

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
