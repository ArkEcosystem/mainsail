import { Container } from "@arkecosystem/core-container";
import {
	BINDINGS,
	IConfiguration,
	IDeserializeOptions,
	IPublicKeySerializer,
	ISignature,
	ITransaction,
	ITransactionData,
	ITransactionDeserializer,
} from "@arkecosystem/core-crypto-contracts";
import { Contracts } from "@arkecosystem/core-kernel";
import { BigNumber, ByteBuffer } from "@arkecosystem/utils";

// import { DuplicateParticipantInMultiSignatureError, InvalidTransactionBytesError } from "./errors";

@Container.injectable()
export class Deserializer implements ITransactionDeserializer {
	@Container.inject(BINDINGS.Configuration)
	protected readonly configuration: IConfiguration;

	@Container.inject(BINDINGS.Transaction.TypeFactory)
	private readonly transactionTypeFactory: Contracts.Transactions.ITransactionTypeFactory;

	@Container.inject(BINDINGS.Identity.PublicKeySerializer)
	private readonly publicKeySerializer: IPublicKeySerializer;

	@Container.inject(BINDINGS.Signature)
	private readonly signatureSerializer: ISignature;

	public async deserialize(serialized: string | Buffer, options: IDeserializeOptions = {}): Promise<ITransaction> {
		const data = {} as ITransactionData;

		const buff: ByteBuffer = this.getByteBuffer(serialized);
		this.deserializeCommon(data, buff);

		const instance: ITransaction = this.transactionTypeFactory.create(data);
		this.deserializeVendorField(instance, buff);

		// Deserialize type specific parts
		await instance.deserialize(buff);

		this.deserializeSignatures(data, buff);

		instance.serialized = buff.getResult();

		return instance;
	}

	public deserializeCommon(transaction: ITransactionData, buf: ByteBuffer): void {
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

	private deserializeVendorField(transaction: ITransaction, buf: ByteBuffer): void {
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

	private deserializeSignatures(transaction: ITransactionData, buf: ByteBuffer): void {
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
