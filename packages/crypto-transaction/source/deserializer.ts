import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { BigNumber, ByteBuffer } from "@mainsail/utils";

@injectable()
export class Deserializer implements Contracts.Crypto.TransactionDeserializer {
	@inject(Identifiers.Cryptography.Configuration)
	protected readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Cryptography.Transaction.TypeFactory)
	private readonly transactionTypeFactory!: Contracts.Transactions.TransactionTypeFactory;

	@inject(Identifiers.Cryptography.Identity.PublicKey.Serializer)
	@tagged("type", "wallet")
	private readonly publicKeySerializer!: Contracts.Crypto.PublicKeySerializer;

	@inject(Identifiers.Cryptography.Signature.Instance)
	@tagged("type", "wallet")
	private readonly signatureSerializer!: Contracts.Crypto.Signature;

	@inject(Identifiers.Cryptography.Signature.Size)
	@tagged("type", "wallet")
	private readonly signatureSize!: number;

	public async deserialize(serialized: string | Buffer): Promise<Contracts.Crypto.Transaction> {
		const data = {} as Contracts.Crypto.TransactionData;

		const buff: ByteBuffer = this.#getByteBuffer(serialized);
		this.deserializeCommon(data, buff);

		const instance: Contracts.Crypto.Transaction = this.transactionTypeFactory.create(data);
		this.#deserializeVendorField(instance, buff);

		// Deserialize type specific parts
		await instance.deserialize(buff);

		this.#deserializeSignatures(data, buff);

		instance.serialized = buff.getResult();

		return instance;
	}

	public deserializeCommon(transaction: Contracts.Crypto.TransactionData, buf: ByteBuffer): void {
		buf.skip(1); // Skip 0xFF marker
		transaction.version = buf.readUint8();
		transaction.network = buf.readUint8();
		transaction.typeGroup = buf.readUint32();
		transaction.type = buf.readUint16();
		transaction.nonce = BigNumber.make(buf.readUint64());
		transaction.senderPublicKey = this.publicKeySerializer.deserialize(buf).toString("hex");
		transaction.fee = BigNumber.make(buf.readUint256());
		transaction.amount = BigNumber.ZERO;
	}

	#deserializeVendorField(transaction: Contracts.Crypto.Transaction, buf: ByteBuffer): void {
		const vendorFieldLength: number = buf.readUint8();

		if (vendorFieldLength > 0) {
			if (transaction.hasVendorField()) {
				const vendorFieldBuffer: Buffer = buf.readBytes(vendorFieldLength);
				transaction.data.vendorField = vendorFieldBuffer.toString("utf8");
			} else {
				buf.skip(vendorFieldLength);
			}
		}
	}

	#deserializeSignatures(transaction: Contracts.Crypto.TransactionData, buf: ByteBuffer): void {
		// @TODO: take into account what the length of signatures is based on plugins
		// Check the length of the reminder: if only one signature is left or if the length is not a multiple of multisignature length, it's a single signature
		if (
			buf.getRemainderLength() &&
			(buf.getRemainderLength() % this.signatureSize === 0 ||
				buf.getRemainderLength() % (this.signatureSize + 1) !== 0)
		) {
			transaction.signature = this.signatureSerializer.deserialize(buf).toString("hex");
		}

		if (buf.getRemainderLength()) {
			if (buf.getRemainderLength() % (this.signatureSize + 1) === 0) {
				transaction.signatures = [];

				const count: number = buf.getRemainderLength() / (this.signatureSize + 1);
				const publicKeyIndexes: { [index: number]: boolean } = {};
				for (let index = 0; index < count; index++) {
					const multiSignaturePart: string = buf.readBytes(this.signatureSize + 1).toString("hex");
					const publicKeyIndex: number = Number.parseInt(multiSignaturePart.slice(0, 2), 16);

					if (!publicKeyIndexes[publicKeyIndex]) {
						publicKeyIndexes[publicKeyIndex] = true;
					} else {
						throw new Exceptions.DuplicateParticipantInMultiSignatureError();
					}

					transaction.signatures.push(multiSignaturePart);
				}
			} else {
				throw new Exceptions.InvalidTransactionBytesError("signature buffer not exhausted");
			}
		}
	}

	#getByteBuffer(serialized: Buffer | string): ByteBuffer {
		if (!(serialized instanceof Buffer)) {
			serialized = Buffer.from(serialized, "hex");
		}

		return ByteBuffer.fromBuffer(serialized);
	}
}
