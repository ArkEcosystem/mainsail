import { inject, injectable, multiInject, optional } from "@arkecosystem/core-container";
import Contracts, { Crypto, Identifiers } from "@arkecosystem/core-contracts";
import { ByteBuffer } from "@arkecosystem/utils";

import { InvalidTransactionDataError } from "./errors";

@injectable()
export class Processor implements Contracts.TransactionPool.Processor {
	@multiInject(Identifiers.TransactionPoolProcessorExtension)
	@optional()
	private readonly extensions: Contracts.TransactionPool.ProcessorExtension[] = [];

	@inject(Identifiers.TransactionPoolService)
	private readonly pool!: Contracts.TransactionPool.Service;

	@inject(Identifiers.PeerTransactionBroadcaster)
	@optional()
	private readonly transactionBroadcaster!: Contracts.P2P.TransactionBroadcaster | undefined;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Cryptography.Transaction.Factory)
	private readonly transactionFactory: Crypto.ITransactionFactory;

	@inject(Identifiers.Cryptography.Transaction.Deserializer)
	private readonly deserializer: Crypto.ITransactionDeserializer;

	public async process(
		data: Crypto.ITransactionData[] | Buffer[],
	): Promise<Contracts.TransactionPool.ProcessorResult> {
		const accept: string[] = [];
		const broadcast: string[] = [];
		const invalid: string[] = [];
		const excess: string[] = [];
		let errors: { [id: string]: Contracts.TransactionPool.ProcessorError } | undefined;

		const broadcastTransactions: Crypto.ITransaction[] = [];

		try {
			for (const [index, transactionData] of data.entries()) {
				const entryId = transactionData instanceof Buffer ? String(index) : transactionData.id ?? String(index);

				try {
					const transaction =
						transactionData instanceof Buffer
							? await this.getTransactionFromBuffer(transactionData)
							: await this.getTransactionFromData(transactionData);
					await this.pool.addTransaction(transaction);
					accept.push(entryId);

					try {
						await Promise.all(this.extensions.map((e) => e.throwIfCannotBroadcast(transaction)));
						broadcastTransactions.push(transaction);
						broadcast.push(entryId);
					} catch {}
				} catch (error) {
					invalid.push(entryId);

					if (error instanceof Contracts.TransactionPool.PoolError) {
						if (error.type === "ERR_EXCEEDS_MAX_COUNT") {
							excess.push(entryId);
						}

						if (!errors) {
							errors = {};
						}
						errors[entryId] = {
							message: error.message,
							type: error.type,
						};
					} else {
						throw error;
					}
				}
			}
		} finally {
			if (this.transactionBroadcaster && broadcastTransactions.length > 0) {
				this.transactionBroadcaster
					.broadcastTransactions(broadcastTransactions)
					.catch((error) => this.logger.error(error.stack));
			}
		}

		return {
			accept,
			broadcast,
			errors,
			excess,
			invalid,
		};
	}

	private async getTransactionFromBuffer(transactionData: Buffer): Promise<Crypto.ITransaction> {
		try {
			const transactionCommon = {} as Crypto.ITransactionData;
			const txByteBuffer = new ByteBuffer(transactionData);
			this.deserializer.deserializeCommon(transactionCommon, txByteBuffer);

			return this.transactionFactory.fromBytes(transactionData);
		} catch (error) {
			throw new InvalidTransactionDataError(error.message);
		}
	}

	private async getTransactionFromData(transactionData: Crypto.ITransactionData): Promise<Crypto.ITransaction> {
		try {
			return this.transactionFactory.fromData(transactionData);
		} catch (error) {
			throw new InvalidTransactionDataError(error.message);
		}
	}
}
