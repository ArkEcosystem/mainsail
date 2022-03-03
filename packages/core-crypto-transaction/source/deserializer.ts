import { inject, injectable } from "@arkecosystem/core-container";
import Contracts, { Crypto, Identifiers } from "@arkecosystem/core-contracts";
import { BigNumber, ByteBuffer } from "@arkecosystem/utils";

// import { DuplicateParticipantInMultiSignatureError, InvalidTransactionBytesError } from "@arkecosystem/core-contracts";

@injectable()
export class Deserializer implements Crypto.ITransactionDeserializer {
	@inject(Identifiers.Cryptography.Configuration)
	protected readonly configuration: Crypto.IConfiguration;

	@inject(Identifiers.Cryptography.Transaction.TypeFactory)
	private readonly transactionTypeFactory: Contracts.Transactions.ITransactionTypeFactory;

	@inject(Identifiers.Cryptography.Identity.PublicKeySerializer)
	private readonly publicKeySerializer: Crypto.IPublicKeySerializer;

	@inject(Identifiers.Cryptography.Signature)
	private readonly signatureSerializer: Crypto.ISignature;

	public async deserialize(
		serialized: string | Buffer,
		options: Crypto.IDeserializeOptions = {},
	): Promise<Crypto.ITransaction> {
		const data = {} as Crypto.ITransactionData;

		const buff: ByteBuffer = this.getByteBuffer(serialized);
		this.deserializeCommon(data, buff);

		const instance: Crypto.ITransaction = this.transactionTypeFactory.create(data);
		this.deserializeVendorField(instance, buff);

		// Deserialize type specific parts
		await instance.deserialize(buff);

		this.deserializeSignatures(data, buff);

		instance.serialized = buff.getResult();

		return instance;
	}

	public deserializeCommon(transaction: Crypto.ITransactionData, buf: ByteBuffer): void {
		// buf.skip(1); // Skip 0xFF marker
		buf.jump(1); // Skip 0xFF marker
		transaction.version = buf.readUInt8();
		transaction.network = buf.readUInt8();

		if (transaction.version === 1) {
			transaction.type = buf.readUInt8();
			transaction.timestamp = buf.readUInt32LE();
		} else {
			transaction.typeGroup = buf.readUInt32LE();
			transaction.type = buf.readUInt16LE();
			transaction.nonce = BigNumber.make(buf.readBigUInt64LE());
		}

		transaction.senderPublicKey = this.publicKeySerializer.deserialize(buf).toString("hex");
		transaction.fee = BigNumber.make(buf.readBigUInt64LE().toString());
		transaction.amount = BigNumber.ZERO;
	}

	private deserializeVendorField(transaction: Crypto.ITransaction, buf: ByteBuffer): void {
		const vendorFieldLength: number = buf.readUInt8();

		if (vendorFieldLength > 0) {
			if (transaction.hasVendorField()) {
				const vendorFieldBuffer: Buffer = buf.readBuffer(vendorFieldLength);
				transaction.data.vendorField = vendorFieldBuffer.toString("utf8");
			} else {
				buf.jump(vendorFieldLength);
			}
		}
	}

	private deserializeSignatures(transaction: Crypto.ITransactionData, buf: ByteBuffer): void {
		// @TODO
		const canReadNonMultiSignature = () =>
			buf.getRemainderLength() && (buf.getRemainderLength() % 64 === 0 || buf.getRemainderLength() % 65 !== 0);

		if (canReadNonMultiSignature()) {
			transaction.signature = this.signatureSerializer.deserialize(buf).toString("hex");
		}

		// @TODO: musig
		// if (buf.getRemainderLength()) {
		// 	if (buf.getRemainderLength() % 65 === 0) {
		// 		transaction.signatures = [];

		// 		const count: number = buf.getRemainderLength() / 65;
		// 		const publicKeyIndexes: { [index: number]: boolean } = {};
		// 		for (let index = 0; index < count; index++) {
		// 			const multiSignaturePart: string = buf.readBuffer(65).toString("hex");
		// 			const publicKeyIndex: number = Number.parseInt(multiSignaturePart.slice(0, 2), 16);

		// 			if (!publicKeyIndexes[publicKeyIndex]) {
		// 				publicKeyIndexes[publicKeyIndex] = true;
		// 			} else {
		// 				throw new DuplicateParticipantInMultiSignatureError();
		// 			}

		// 			transaction.signatures.push(multiSignaturePart);
		// 		}
		// 	} else {
		// 		throw new InvalidTransactionBytesError("signature buffer not exhausted");
		// 	}
		// }
	}

	private getByteBuffer(serialized: Buffer | string): ByteBuffer {
		if (!(serialized instanceof Buffer)) {
			serialized = Buffer.from(serialized, "hex");
		}

		return new ByteBuffer(serialized);
	}
}
