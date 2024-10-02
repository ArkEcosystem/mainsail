import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { extendSchema, Transaction, transactionBaseSchema } from "@mainsail/crypto-transaction";
import { BigNumber, ByteBuffer } from "@mainsail/utils";

@injectable()
export class EvmCallTransaction extends Transaction {
	@inject(Identifiers.Cryptography.Identity.Address.Serializer)
	private readonly addressSerializer!: Contracts.Crypto.AddressSerializer;

	@inject(Identifiers.Cryptography.Identity.Address.Size)
	private readonly addressSize!: number;

	public static type: number = 0;
	public static key = "evmCall";

	public static getSchema(): Contracts.Crypto.TransactionSchema {
		return extendSchema(transactionBaseSchema, {
			$id: "evmCall",
			properties: {
				value: { bignumber: { maximum: undefined, minimum: 0 } },
				gasPrice: { bignumber: { maximum: 1000, minimum: 0 } },
				gasLimit: { transactionGasLimit: {} },
				data: { bytecode: {} },
				recipientAddress: { $ref: "address" },
				type: { enum: [0] }, // refers to ethereum tx type
			},
			required: ["gasPrice", "gasLimit", "type"],
		});
	}

	public assetSize(): number {
		return (
			32 + // value
			1 + // recipient marker
			(this.data.recipientAddress ? this.addressSize : 0) + // recipient
			4 + // payload length
			Buffer.byteLength(this.data.data, "hex")
		);
	}

	public async serialize(options?: Contracts.Crypto.SerializeOptions): Promise<ByteBuffer> {
		const { addressSize, addressFactory, addressSerializer, data } = this;

		const dataBytes = Buffer.from(data.data, "hex");

		const buff: ByteBuffer = ByteBuffer.fromSize(
			32 + 1 + (data.recipientAddress ? addressSize : 0) + 4 + dataBytes.byteLength,
		);

		buff.writeUint256(data.value.toBigInt());

		if (data.recipientAddress) {
			buff.writeUint8(1);
			addressSerializer.serialize(buff, await addressFactory.toBuffer(data.recipientAddress));
		} else {
			buff.writeUint8(0);
		}

		buff.writeUint32(dataBytes.byteLength);
		buff.writeBytes(dataBytes);

		return buff;
	}

	public async deserialize(buf: ByteBuffer): Promise<void> {
		const { data, addressFactory, addressSerializer } = this;

		data.value = BigNumber.make(buf.readUint256());

		const recipientMarker = buf.readUint8();
		if (recipientMarker === 1) {
			data.recipientAddress = await addressFactory.fromBuffer(addressSerializer.deserialize(buf));
		}

		const dataLength = buf.readUint32();
		const dataBytes = buf.readBytes(dataLength);

		data.data = dataBytes.toString("hex");
	}
}
