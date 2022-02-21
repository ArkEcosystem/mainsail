import { Container } from "@arkecosystem/container";
import { BINDINGS } from "@arkecosystem/crypto-contracts";
import { Configuration } from "@arkecosystem/crypto-config";
import { ByteBuffer } from "@arkecosystem/utils";

import { TransactionType, TransactionTypeGroup } from "./enums";
import { TransactionVersionError } from "./errors";
import { Address } from "@arkecosystem/crypto-identities";
import { ISerializeOptions, ITransaction, ITransactionData } from "@arkecosystem/crypto-contracts";
import { isSupportedTransactionVersion } from "./helpers";
import { TransactionTypeFactory } from "./types";

@Container.injectable()
export class Serializer {
	@Container.inject(BINDINGS.Configuration)
	private readonly configuration: Configuration;

	public getBytes(transaction: ITransactionData, options: ISerializeOptions = {}): Buffer {
		const version: number = transaction.version || 1;

		if (
			options.acceptLegacyVersion ||
			options.disableVersionCheck ||
			isSupportedTransactionVersion(this.configuration, version)
		) {
			if (version === 1) {
				return this.getBytesV1(transaction, options);
			}

			return this.serialize(TransactionTypeFactory.create(transaction), options);
		} else {
			throw new TransactionVersionError(version);
		}
	}

	public serialize(transaction: ITransaction, options: ISerializeOptions = {}): Buffer {
		const buff: ByteBuffer = new ByteBuffer(
			Buffer.alloc(this.configuration.getMilestone(this.configuration.getHeight()).block?.maxPayload ?? 8192),
		);

		this.serializeCommon(transaction.data, buff);
		this.serializeVendorField(transaction, buff);

		const serialized: ByteBuffer | undefined = transaction.serialize(options);

		if (!serialized) {
			throw new Error();
		}

		buff.writeBuffer(serialized.getResult());

		this.serializeSignatures(transaction.data, buff, options);

		const bufferBuffer = buff.getResult();
		transaction.serialized = bufferBuffer;

		return bufferBuffer;
	}

	private getBytesV1(transaction: ITransactionData, options: ISerializeOptions = {}): Buffer {
		let assetSize = 0;
		let assetBytes: Buffer | Uint8Array | undefined;

		if (
			transaction.type === TransactionType.DelegateRegistration &&
			transaction.asset &&
			transaction.asset.delegate
		) {
			assetBytes = Buffer.from(transaction.asset.delegate.username, "utf8");
			assetSize = assetBytes.length;
		}

		if (transaction.type === TransactionType.Vote && transaction.asset && transaction.asset.votes) {
			assetBytes = Buffer.from(transaction.asset.votes.join(""), "utf8");
			assetSize = assetBytes.length;
		}

		if (
			transaction.type === TransactionType.MultiSignature &&
			transaction.asset &&
			transaction.asset.multiSignatureLegacy
		) {
			const keysgroupBuffer: Buffer = Buffer.from(
				transaction.asset.multiSignatureLegacy.keysgroup.join(""),
				"utf8",
			);
			const bb: ByteBuffer = new ByteBuffer(Buffer.alloc(1 + 1 + keysgroupBuffer.length));

			bb.writeUInt8(transaction.asset.multiSignatureLegacy.min);
			bb.writeUInt8(transaction.asset.multiSignatureLegacy.lifetime);

			for (const byte of keysgroupBuffer) {
				bb.writeUInt8(byte);
			}

			assetBytes = bb.getResult();
			assetSize = assetBytes.length;
		}

		const bb: ByteBuffer = new ByteBuffer(Buffer.alloc(1 + 4 + 32 + 8 + 8 + 21 + 255 + 64 + 64 + 64 + assetSize));

		bb.writeUInt8(transaction.type);
		bb.writeUInt32LE(transaction.timestamp);

		if (transaction.senderPublicKey) {
			bb.writeBuffer(Buffer.from(transaction.senderPublicKey, "hex"));

			if (transaction.recipientId && transaction.type !== 1 && transaction.type !== 4) {
				const recipientId =
					transaction.recipientId ||
					Address.fromPublicKey(transaction.senderPublicKey, { pubKeyHash: transaction.network });
				bb.writeBuffer(Address.toBuffer(recipientId, this.configuration.get("network")).addressBuffer);
			} else {
				for (let i = 0; i < 21; i++) {
					bb.writeUInt8(0);
				}
			}
		}

		if (transaction.vendorField) {
			const vf: Buffer = Buffer.from(transaction.vendorField);
			const fillstart: number = vf.length;
			bb.writeBuffer(vf);

			for (let i = fillstart; i < 64; i++) {
				bb.writeUInt8(0);
			}
		} else {
			for (let i = 0; i < 64; i++) {
				bb.writeUInt8(0);
			}
		}

		bb.writeBigUInt64LE(transaction.amount.toBigInt());

		bb.writeBigUInt64LE(transaction.fee.toBigInt());

		if (assetSize > 0 && assetBytes) {
			for (let i = 0; i < assetSize; i++) {
				bb.writeUInt8(assetBytes[i]);
			}
		}

		if (!options.excludeSignature && transaction.signature) {
			bb.writeBuffer(Buffer.from(transaction.signature, "hex"));
		}

		return bb.getResult();
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
