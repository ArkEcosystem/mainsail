import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { BigNumber, ByteBuffer } from "@mainsail/utils";

@injectable()
export class Deserializer implements Contracts.Crypto.TransactionDeserializer {
	@inject(Identifiers.Cryptography.Configuration)
	protected readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Cryptography.Transaction.TypeFactory)
	private readonly transactionTypeFactory!: Contracts.Transactions.TransactionTypeFactory;

	@inject(Identifiers.Cryptography.Signature.Size)
	@tagged("type", "wallet")
	private readonly signatureSize!: number;

	@inject(Identifiers.Cryptography.Signature.Instance)
	@tagged("type", "wallet")
	private readonly signatureSerializer!: Contracts.Crypto.Signature;

	public async deserialize(serialized: string | Buffer): Promise<Contracts.Crypto.Transaction> {
		const data = {} as Contracts.Crypto.TransactionData;

		const buff: ByteBuffer = this.#getByteBuffer(serialized);
		this.deserializeCommon(data, buff);

		const instance: Contracts.Crypto.Transaction = this.transactionTypeFactory.create(data);

		// Deserialize type specific parts
		await instance.deserialize(buff);

		this.#deserializeSignatures(data, buff);

		instance.serialized = buff.getResult();

		return instance;
	}

	public deserializeCommon(transaction: Contracts.Crypto.TransactionData, buf: ByteBuffer): void {
		transaction.network = buf.readUint8();
		transaction.type = buf.readUint8();
		transaction.nonce = BigNumber.make(buf.readUint64());
		transaction.gasPrice = buf.readUint32();
		transaction.gasLimit = buf.readUint32();
		transaction.value = BigNumber.ZERO;
	}

	#deserializeSignatures(transaction: Contracts.Crypto.TransactionData, buf: ByteBuffer): void {
		if (
			buf.getRemainderLength() &&
			(buf.getRemainderLength() % this.signatureSize === 0 ||
				buf.getRemainderLength() % (this.signatureSize + 1) !== 0)
		) {
			const signature = this.signatureSerializer.deserialize(buf);
			transaction.signature = signature.toString("hex");
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
