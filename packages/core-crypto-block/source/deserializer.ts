import { Container } from "@arkecosystem/core-container";
import { Configuration } from "@arkecosystem/core-crypto-config";
import { BINDINGS, IBlockData, IBlockDeserializer, ITransaction } from "@arkecosystem/core-crypto-contracts";
import { TransactionFactory } from "@arkecosystem/core-crypto-transaction";
import { BigNumber } from "@arkecosystem/utils";
import ByteBuffer from "bytebuffer";

import { IDFactory } from "./id.factory";

@Container.injectable()
export class Deserializer implements IBlockDeserializer {
	@Container.inject(BINDINGS.Configuration)
	private readonly configuration: Configuration;

	@Container.inject(BINDINGS.Block.IDFactory)
	private readonly idFactory: IDFactory;

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

			return Number.parseInt(lengthHex, 16) + 2;
		};

		block.blockSignature = buf.readBytes(signatureLength()).toString("hex");
	}

	private async deserializeTransactions(
		block: IBlockData,
		buf: ByteBuffer,
		deserializeTransactionsUnchecked = false,
	): Promise<ITransaction[]> {
		const transactionLengths: number[] = [];

		for (let index = 0; index < block.numberOfTransactions; index++) {
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
