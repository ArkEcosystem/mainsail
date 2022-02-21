import ByteBuffer from "bytebuffer";

import { Container } from "@arkecosystem/container";
import { BINDINGS, IBlockData, ITransaction } from "@arkecosystem/crypto-contracts";
import { TransactionFactory } from "@arkecosystem/crypto-transaction";
import { BigNumber } from "@arkecosystem/utils";
import { Configuration } from "@arkecosystem/crypto-config";

import { IdFactory } from "./id.factory";

@Container.injectable()
export class Deserializer {
	@Container.inject(BINDINGS.Configuration)
	private readonly configuration: Configuration;

	@Container.inject(BINDINGS.Block.IdFactory)
	private readonly idFactory: IdFactory;

	@Container.inject(BINDINGS.Transaction.Factory)
	private readonly transactionFactory: TransactionFactory;

	public async deserialize(
		serialized: Buffer,
		headerOnly = false,
		options: { deserializeTransactionsUnchecked?: boolean } = {},
	): Promise<{ data: IBlockData; transactions: ITransaction[] }> {
		const block = {} as IBlockData;
		let transactions: ITransaction[] = [];

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

	private deserializeHeader(block: IBlockData, buf: ByteBuffer): void {
		block.version = buf.readUint32();
		block.timestamp = buf.readUint32();
		block.height = buf.readUint32();

		const constants = this.configuration.getMilestone(block.height - 1 || 1);

		if (constants.block.idFullSha256) {
			const previousBlockFullSha256 = buf.readBytes(32).toString("hex");
			block.previousBlockHex = previousBlockFullSha256;
			block.previousBlock = previousBlockFullSha256;
		} else {
			block.previousBlockHex = buf.readBytes(8).toString("hex");
			block.previousBlock = BigNumber.make(`0x${block.previousBlockHex}`).toString();
		}

		block.numberOfTransactions = buf.readUint32();
		block.totalAmount = BigNumber.make(buf.readUint64().toString());
		block.totalFee = BigNumber.make(buf.readUint64().toString());
		block.reward = BigNumber.make(buf.readUint64().toString());
		block.payloadLength = buf.readUint32();
		block.payloadHash = buf.readBytes(32).toString("hex");
		block.generatorPublicKey = buf.readBytes(33).toString("hex");

		const signatureLength = (): number => {
			buf.mark();

			const lengthHex: string = buf.skip(1).readBytes(1).toString("hex");

			buf.reset();

			return parseInt(lengthHex, 16) + 2;
		};

		block.blockSignature = buf.readBytes(signatureLength()).toString("hex");
	}

	private async deserializeTransactions(
		block: IBlockData,
		buf: ByteBuffer,
		deserializeTransactionsUnchecked = false,
	): Promise<ITransaction[]> {
		const transactionLengths: number[] = [];

		for (let i = 0; i < block.numberOfTransactions; i++) {
			transactionLengths.push(buf.readUint32());
		}

		const transactions: ITransaction[] = [];
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
