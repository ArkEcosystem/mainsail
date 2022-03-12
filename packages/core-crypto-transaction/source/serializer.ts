import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Exceptions, Identifiers } from "@arkecosystem/core-contracts";
import { ByteBuffer } from "@arkecosystem/utils";

@injectable()
export class Serializer implements Contracts.Crypto.ITransactionSerializer {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.Cryptography.Transaction.TypeFactory)
	private readonly transactionTypeFactory: Contracts.Transactions.ITransactionTypeFactory;

	public async getBytes(
		transaction: Contracts.Crypto.ITransactionData,
		options: Contracts.Crypto.ISerializeOptions = {},
	): Promise<Buffer> {
		const version: number = transaction.version || 1;

		if (version) {
			return this.serialize(this.transactionTypeFactory.create(transaction), options);
		}

		throw new Exceptions.TransactionVersionError(version);
	}

	public async serialize(
		transaction: Contracts.Crypto.ITransaction,
		options: Contracts.Crypto.ISerializeOptions = {},
	): Promise<Buffer> {
		const buff: ByteBuffer = ByteBuffer.fromSize(
			this.configuration.getMilestone(this.configuration.getHeight()).block?.maxPayload ?? 8192,
		);

		this.#serializeCommon(transaction.data, buff);
		this.#serializeVendorField(transaction, buff);

		const serialized: ByteBuffer | undefined = await transaction.serialize(options);

		if (!serialized) {
			throw new Error();
		}

		buff.writeBytes(serialized.getResult());

		this.#serializeSignatures(transaction.data, buff, options);

		const bufferBuffer = buff.getResult();
		transaction.serialized = bufferBuffer;

		return bufferBuffer;
	}

	#serializeCommon(transaction: Contracts.Crypto.ITransactionData, buff: ByteBuffer): void {
		transaction.version = transaction.version || 0x01;
		if (transaction.typeGroup === undefined) {
			transaction.typeGroup = Contracts.Crypto.TransactionTypeGroup.Core;
		}

		buff.writeUint8(0xff);
		buff.writeUint8(transaction.version);
		buff.writeUint8(transaction.network || this.configuration.get("network.pubKeyHash"));
		buff.writeUint32(transaction.typeGroup);
		buff.writeUint16(transaction.type);

		if (transaction.nonce) {
			buff.writeUint64(transaction.nonce.toBigInt());
		}

		if (transaction.senderPublicKey) {
			buff.writeBytes(Buffer.from(transaction.senderPublicKey, "hex"));
		}

		buff.writeUint64(transaction.fee.toBigInt());
	}

	#serializeVendorField(transaction: Contracts.Crypto.ITransaction, buff: ByteBuffer): void {
		const { data }: Contracts.Crypto.ITransaction = transaction;

		if (transaction.hasVendorField() && data.vendorField) {
			const vf: Buffer = Buffer.from(data.vendorField, "utf8");
			buff.writeUint8(vf.length);
			buff.writeBytes(vf);
		} else {
			buff.writeUint8(0x00);
		}
	}

	#serializeSignatures(
		transaction: Contracts.Crypto.ITransactionData,
		buff: ByteBuffer,
		options: Contracts.Crypto.ISerializeOptions = {},
	): void {
		if (transaction.signature && !options.excludeSignature) {
			buff.writeBytes(Buffer.from(transaction.signature, "hex"));
		}

		if (transaction.signatures && !options.excludeMultiSignature) {
			buff.writeBytes(Buffer.from(transaction.signatures.join(""), "hex"));
		}
	}
}
