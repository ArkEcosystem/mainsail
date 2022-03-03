import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { TransactionFactory } from "@arkecosystem/core-crypto-transaction";
import { BigNumber } from "@arkecosystem/utils";
import ByteBuffer from "bytebuffer";

import { IDFactory } from "./id.factory";

@injectable()
export class Deserializer implements Contracts.Crypto.IBlockDeserializer {
	@inject(Identifiers.Cryptography.Block.IDFactory)
	private readonly idFactory: IDFactory;

	@inject(Identifiers.Cryptography.Transaction.Factory)
	private readonly transactionFactory: TransactionFactory;

	@inject(Identifiers.Cryptography.Identity.PublicKeySerializer)
	private readonly publicKeySerializer: Contracts.Crypto.IPublicKeySerializer;

	@inject(Identifiers.Cryptography.Signature)
	private readonly signatureSerializer: Contracts.Crypto.ISignature;

	public async deserialize(
		serialized: Buffer,
		headerOnly = false,
		options: { deserializeTransactionsUnchecked?: boolean } = {},
	): Promise<{ data: Contracts.Crypto.IBlockData; transactions: Contracts.Crypto.ITransaction[] }> {
		const block = {} as Contracts.Crypto.IBlockData;
		let transactions: Contracts.Crypto.ITransaction[] = [];

		const buf: ByteBuffer = new ByteBuffer(serialized.length, true);
		buf.append(serialized);
		buf.reset();

		this.deserializeHeader(block, buf);

		headerOnly = headerOnly || buf.remaining() === 0;
		if (!headerOnly) {
			transactions = await this.deserializeTransactions(block, buf, options.deserializeTransactionsUnchecked);
		}

		block.id = await this.idFactory.make(block);

		return { data: block, transactions };
	}

	private deserializeHeader(block: Contracts.Crypto.IBlockData, buf: ByteBuffer): void {
		block.version = buf.readUint32();
		block.timestamp = +buf.readUint64().toString();
		block.height = buf.readUint32();

		const previousBlockFullSha256 = buf.readBytes(32).toString("hex");
		block.previousBlockHex = previousBlockFullSha256;
		block.previousBlock = previousBlockFullSha256;

		block.numberOfTransactions = buf.readUint32();
		block.totalAmount = BigNumber.make(buf.readUint64().toString());
		block.totalFee = BigNumber.make(buf.readUint64().toString());
		block.reward = BigNumber.make(buf.readUint64().toString());
		block.payloadLength = buf.readUint32();
		block.payloadHash = buf.readBytes(32).toString("hex");
		block.generatorPublicKey = this.publicKeySerializer.deserialize(buf).toString("hex");
		block.blockSignature = this.signatureSerializer.deserialize(buf).toString("hex");
	}

	private async deserializeTransactions(
		block: Contracts.Crypto.IBlockData,
		buf: ByteBuffer,
		deserializeTransactionsUnchecked = false,
	): Promise<Contracts.Crypto.ITransaction[]> {
		const transactionLengths: number[] = [];

		for (let index = 0; index < block.numberOfTransactions; index++) {
			transactionLengths.push(buf.readUint32());
		}

		const transactions: Contracts.Crypto.ITransaction[] = [];
		block.transactions = [];
		for (const length of transactionLengths) {
			const transactionBytes = buf.readBytes(length).toBuffer();
			const transaction = deserializeTransactionsUnchecked
				? await this.transactionFactory.fromBytesUnsafe(transactionBytes)
				: await this.transactionFactory.fromBytes(transactionBytes);

			transactions.push(transaction);
			block.transactions.push(transaction.data);
		}

		return transactions;
	}
}
