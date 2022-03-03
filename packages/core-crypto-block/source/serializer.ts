import assert from "assert";
import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Exceptions } from "@arkecosystem/core-contracts";
import { Utils } from "@arkecosystem/core-crypto-transaction";
import ByteBuffer from "bytebuffer";

@injectable()
export class Serializer implements Contracts.Crypto.IBlockSerializer {
	@inject(Identifiers.Cryptography.Transaction.Utils)
	private readonly utils: Utils;

	@inject(Identifiers.Cryptography.Identity.PublicKeySerializer)
	private readonly publicKeySerializer: Contracts.Crypto.IPublicKeySerializer;

	@inject(Identifiers.Cryptography.Signature)
	private readonly signatureSerializer: Contracts.Crypto.ISignature;

	public size(block: Contracts.Crypto.IBlock): number {
		let size = this.headerSize(block.data) + block.data.blockSignature.length / 2;

		for (const transaction of block.transactions) {
			size += 4 /* tx length */ + transaction.serialized.length;
		}

		return size;
	}

	public async serializeWithTransactions(block: Contracts.Crypto.IBlockData): Promise<Buffer> {
		const transactions: Contracts.Crypto.ITransactionData[] = block.transactions || [];
		block.numberOfTransactions = block.numberOfTransactions || transactions.length;

		const serializedHeader: Buffer = this.serialize(block);

		const buff: ByteBuffer = new ByteBuffer(serializedHeader.length + transactions.length * 4, true)
			.append(serializedHeader)
			.skip(transactions.length * 4);

		for (const [index, transaction] of transactions.entries()) {
			const serialized: Buffer = await this.utils.toBytes(transaction);
			buff.writeUint32(serialized.length, serializedHeader.length + index * 4);
			buff.append(serialized);
		}

		return buff.flip().toBuffer();
	}

	public serialize(block: Contracts.Crypto.IBlockData, includeSignature = true): Buffer {
		const buff: ByteBuffer = new ByteBuffer(512, true);

		this.serializeHeader(block, buff);

		if (includeSignature) {
			this.serializeSignature(block, buff);
		}

		return buff.flip().toBuffer();
	}

	private headerSize(block: Contracts.Crypto.IBlockData): number {
		return (
			4 + // version
			8 + // timestamp
			4 + // height
			32 + // previousBlock
			4 + // numberOfTransactions
			8 + // totalAmount
			8 + // totalFee
			8 + // reward
			4 + // payloadLength
			block.payloadHash.length / 2 +
			block.generatorPublicKey.length / 2
		);
	}

	private serializeHeader(block: Contracts.Crypto.IBlockData, buff: ByteBuffer): void {
		if (block.previousBlock.length !== 64) {
			throw new Exceptions.PreviousBlockIdFormatError(block.height, block.previousBlock);
		}

		block.previousBlockHex = block.previousBlock;

		buff.writeUint32(block.version);
		buff.writeUint64(block.timestamp);
		buff.writeUint32(block.height);
		buff.append(block.previousBlockHex, "hex");
		buff.writeUint32(block.numberOfTransactions);
		buff.writeUint64(block.totalAmount.toString());
		buff.writeUint64(block.totalFee.toString());
		buff.writeUint64(block.reward.toString());
		buff.writeUint32(block.payloadLength);
		buff.append(block.payloadHash, "hex");
		this.publicKeySerializer.serialize(buff, block.generatorPublicKey);

		assert.strictEqual(buff.offset, this.headerSize(block));
	}

	private serializeSignature(block: Contracts.Crypto.IBlockData, buff: ByteBuffer): void {
		if (block.blockSignature) {
			this.signatureSerializer.serialize(buff, block.blockSignature);
		}
	}
}
