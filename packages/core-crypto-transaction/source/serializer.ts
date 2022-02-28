import { Container } from "@arkecosystem/core-container";
import {
	BINDINGS,
	IConfiguration,
	ISerializeOptions,
	ITransaction,
	ITransactionData,
	ITransactionSerializer,
} from "@arkecosystem/core-crypto-contracts";
import { Contracts } from "@arkecosystem/core-kernel";
import { ByteBuffer } from "@arkecosystem/utils";

import { TransactionTypeGroup } from "./enums";
import { TransactionVersionError } from "./errors";

@Container.injectable()
export class Serializer implements ITransactionSerializer {
	@Container.inject(BINDINGS.Configuration)
	private readonly configuration: IConfiguration;

	@Container.inject(BINDINGS.Transaction.TypeFactory)
	private readonly transactionTypeFactory: Contracts.Transactions.ITransactionTypeFactory;

	public async getBytes(transaction: ITransactionData, options: ISerializeOptions = {}): Promise<Buffer> {
		const version: number = transaction.version || 1;

		if (version) {
			return this.serialize(this.transactionTypeFactory.create(transaction), options);
		}

		throw new TransactionVersionError(version);
	}

	public async serialize(transaction: ITransaction, options: ISerializeOptions = {}): Promise<Buffer> {
		const buff: ByteBuffer = new ByteBuffer(
			Buffer.alloc(this.configuration.getMilestone(this.configuration.getHeight()).block?.maxPayload ?? 8192),
		);

		this.serializeCommon(transaction.data, buff);
		this.serializeVendorField(transaction, buff);

		const serialized: ByteBuffer | undefined = await transaction.serialize(options);

		if (!serialized) {
			throw new Error();
		}

		buff.writeBuffer(serialized.getResult());

		this.serializeSignatures(transaction.data, buff, options);

		const bufferBuffer = buff.getResult();
		transaction.serialized = bufferBuffer;

		return bufferBuffer;
	}

	private serializeCommon(transaction: ITransactionData, buff: ByteBuffer): void {
		transaction.version = transaction.version || 0x01;
		if (transaction.typeGroup === undefined) {
			transaction.typeGroup = TransactionTypeGroup.Core;
		}

		buff.writeUInt8(0xff);
		buff.writeUInt8(transaction.version);
		buff.writeUInt8(transaction.network || this.configuration.get("network.pubKeyHash"));

		if (transaction.version === 1) {
			buff.writeUInt8(transaction.type);
			buff.writeUInt32LE(transaction.timestamp);
		} else {
			buff.writeUInt32LE(transaction.typeGroup);
			buff.writeUInt16LE(transaction.type);

			if (transaction.nonce) {
				buff.writeBigInt64LE(transaction.nonce.toBigInt());
			}
		}

		if (transaction.senderPublicKey) {
			buff.writeBuffer(Buffer.from(transaction.senderPublicKey, "hex"));
		}

		buff.writeBigInt64LE(transaction.fee.toBigInt());
	}

	private serializeVendorField(transaction: ITransaction, buff: ByteBuffer): void {
		const { data }: ITransaction = transaction;

		if (transaction.hasVendorField() && data.vendorField) {
			const vf: Buffer = Buffer.from(data.vendorField, "utf8");
			buff.writeUInt8(vf.length);
			buff.writeBuffer(vf);
		} else {
			buff.writeUInt8(0x00);
		}
	}

	private serializeSignatures(
		transaction: ITransactionData,
		buff: ByteBuffer,
		options: ISerializeOptions = {},
	): void {
		if (transaction.signature && !options.excludeSignature) {
			buff.writeBuffer(Buffer.from(transaction.signature, "hex"));
		}

		if (transaction.signatures) {
			if (transaction.version === 1) {
				buff.writeUInt8(0xff); // 0xff separator to signal start of multi-signature transactions
				buff.writeBuffer(Buffer.from(transaction.signatures.join(""), "hex"));
			} else if (!options.excludeMultiSignature) {
				buff.writeBuffer(Buffer.from(transaction.signatures.join(""), "hex"));
			}
		}
	}
}
