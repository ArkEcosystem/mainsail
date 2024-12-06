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
				data: { bytecode: {} },
				gasLimit: { transactionGasLimit: {} },
				gasPrice: { bignumber: { maximum: 1000, minimum: 0 } },
				recipientAddress: { $ref: "address" },
				value: { bignumber: { maximum: undefined, minimum: 0 } },
			},
			required: ["gasPrice", "gasLimit"],
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
