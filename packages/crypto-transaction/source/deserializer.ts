import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { BigNumber, ByteBuffer } from "@mainsail/utils";

@injectable()
export class Deserializer implements Contracts.Crypto.TransactionDeserializer {
	@inject(Identifiers.Cryptography.Transaction.TypeFactory)
	private readonly transactionTypeFactory!: Contracts.Transactions.TransactionTypeFactory;

	@inject(Identifiers.Cryptography.Identity.Address.Serializer)
	private readonly addressSerializer!: Contracts.Crypto.AddressSerializer;

	@inject(Identifiers.Cryptography.Identity.Address.Factory)
	private readonly addressFactory!: Contracts.Crypto.AddressFactory;

	@inject(Identifiers.Cryptography.Signature.Size)
	@tagged("type", "wallet")
	private readonly signatureSize!: number;

	public async deserialize(serialized: string | Buffer): Promise<Contracts.Crypto.Transaction> {
		const data = {} as Contracts.Crypto.TransactionData;

		const buff: ByteBuffer = this.#getByteBuffer(serialized);
		this.deserializeCommon(data, buff);

		const instance: Contracts.Crypto.Transaction = this.transactionTypeFactory.create(data);
		await this.#deserializeBody(instance.data, buff);

		this.#deserializeSignatures(instance.data, buff);

		instance.serialized = buff.getResult();

		return instance;
	}

	public deserializeCommon(transaction: Contracts.Crypto.TransactionData, buf: ByteBuffer): void {
		transaction.network = buf.readUint8();
		transaction.nonce = BigNumber.make(buf.readUint64());
		transaction.gasPrice = buf.readUint32();
		transaction.gasLimit = buf.readUint32();
		transaction.value = BigNumber.ZERO;
	}

	async #deserializeBody(transaction: Contracts.Crypto.TransactionData, buf: ByteBuffer): Promise<void> {
		transaction.value = BigNumber.make(buf.readUint256());

		const recipientMarker = buf.readUint8();
		if (recipientMarker === 1) {
			transaction.recipientAddress = await this.addressFactory.fromBuffer(
				this.addressSerializer.deserialize(buf),
			);
		}

		const dataLength = buf.readUint32();
		const dataBytes = buf.readBytes(dataLength);

		transaction.data = dataBytes.toString("hex");
	}

	#deserializeSignatures(transaction: Contracts.Crypto.TransactionData, buf: ByteBuffer): void {
		if (buf.getRemainderLength() && buf.getRemainderLength() % this.signatureSize === 0) {
			transaction.v = buf.readUint8();
			transaction.r = buf.readBytes(32).toString("hex");
			transaction.s = buf.readBytes(32).toString("hex");
		}

		// if (buf.getRemainderLength()) {
		// 	if (buf.getRemainderLength() % (this.signatureSize + 1) === 0) {
		// 		transaction.signatures = [];

		// 		const count: number = buf.getRemainderLength() / (this.signatureSize + 1);
		// 		const publicKeyIndexes: { [index: number]: boolean } = {};
		// 		for (let index = 0; index < count; index++) {
		// 			const multiSignaturePart: string = buf.readBytes(this.signatureSize + 1).toString("hex");
		// 			const publicKeyIndex: number = Number.parseInt(multiSignaturePart.slice(0, 2), 16);

		// 			if (!publicKeyIndexes[publicKeyIndex]) {
		// 				publicKeyIndexes[publicKeyIndex] = true;
		// 			} else {
		// 				throw new Exceptions.DuplicateParticipantInMultiSignatureError();
		// 			}

		// 			transaction.signatures.push(multiSignaturePart);
		// 		}
		// 	} else {
		// 		throw new Exceptions.InvalidTransactionBytesError("signature buffer not exhausted");
		// 	}
		// }
	}

	#getByteBuffer(serialized: Buffer | string): ByteBuffer {
		if (!(serialized instanceof Buffer)) {
			serialized = Buffer.from(serialized, "hex");
		}

		return ByteBuffer.fromBuffer(serialized);
	}
}
