import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { ByteBuffer } from "@mainsail/utils";

@injectable()
export class Serializer implements Contracts.Crypto.TransactionSerializer {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Cryptography.Transaction.TypeFactory)
	private readonly transactionTypeFactory!: Contracts.Transactions.TransactionTypeFactory;

	@inject(Identifiers.Cryptography.Signature.Size)
	@tagged("type", "wallet")
	private readonly signatureSize!: number;

	public async getBytes(
		transaction: Contracts.Crypto.TransactionData,
		options: Contracts.Crypto.SerializeOptions = {},
	): Promise<Buffer> {
		return this.serialize(this.transactionTypeFactory.create(transaction), options);
	}

	public commonSize(transaction: Contracts.Crypto.Transaction): number {
		return (
			1 + // network
			8 + // nonce
			4 + // gasLimit
			4 // gasPrice in gwei
		);
	}

	public signaturesSize(
		transaction: Contracts.Crypto.Transaction,
		options: Contracts.Crypto.SerializeOptions = {},
	): number {
		let size = 0;

		const { data } = transaction;
		if (data.signature && !options.excludeSignature) {
			size += this.signatureSize;
		}

		// if (data.signatures && !options.excludeMultiSignature) {
		// 	size += data.signatures.length * (1 + this.signatureSize) /* 1 additional byte for index */;
		// }

		return size;
	}

	public totalSize(
		transaction: Contracts.Crypto.Transaction,
		options: Contracts.Crypto.SerializeOptions = {},
	): number {
		return this.commonSize(transaction) + transaction.assetSize() + this.signaturesSize(transaction, options);
	}

	public async serialize(
		transaction: Contracts.Crypto.Transaction,
		options: Contracts.Crypto.SerializeOptions = {},
	): Promise<Buffer> {
		const bufferSize = this.totalSize(transaction, options);
		const buff: ByteBuffer = ByteBuffer.fromSize(bufferSize);

		this.#serializeCommon(transaction.data, buff);

		const serialized: ByteBuffer | undefined = await transaction.serialize(options);

		if (!serialized) {
			throw new Error();
		}

		buff.writeBytes(serialized.getResult());

		this.#serializeSignatures(transaction.data, buff, options);

		const bufferBuffer = buff.getResult();
		if (bufferBuffer.length !== bufferSize) {
			throw new Exceptions.InvalidTransactionBytesError(
				`expected size ${bufferSize} actual size: ${bufferBuffer.length}`,
			);
		}

		transaction.serialized = bufferBuffer;

		return bufferBuffer;
	}

	#serializeCommon(transaction: Contracts.Crypto.TransactionData, buff: ByteBuffer): void {
		buff.writeUint8(transaction.network || this.configuration.get("network.pubKeyHash"));
		buff.writeUint64(transaction.nonce.toBigInt());
		buff.writeUint32(transaction.gasPrice);
		buff.writeUint32(transaction.gasLimit);
	}

	#serializeSignatures(
		transaction: Contracts.Crypto.TransactionData,
		buff: ByteBuffer,
		options: Contracts.Crypto.SerializeOptions = {},
	): void {
		if (transaction.signature && !options.excludeSignature) {
			buff.writeBytes(Buffer.from(transaction.signature, "hex"));
		}

		// if (transaction.signatures && !options.excludeMultiSignature) {
		// 	buff.writeBytes(Buffer.from(transaction.signatures.join(""), "hex"));
		// }
	}
}
