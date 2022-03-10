import { inject, injectable, multiInject, optional } from "@arkecosystem/core-container";
import { Contracts, Identifiers, Exceptions } from "@arkecosystem/core-contracts";
import { ByteBuffer } from "@arkecosystem/utils";

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
	private readonly transactionFactory: Contracts.Crypto.ITransactionFactory;

	@inject(Identifiers.Cryptography.Transaction.Deserializer)
	private readonly deserializer: Contracts.Crypto.ITransactionDeserializer;

	public async process(
		data: Contracts.Crypto.ITransactionData[] | Buffer[],
	): Promise<Contracts.TransactionPool.ProcessorResult> {
		const accept: string[] = [];
		const broadcast: string[] = [];
		const invalid: string[] = [];
		const excess: string[] = [];
		let errors: { [id: string]: Contracts.TransactionPool.ProcessorError } | undefined;

		const broadcastTransactions: Contracts.Crypto.ITransaction[] = [];

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

					if (error instanceof Exceptions.PoolError) {
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

	private async getTransactionFromBuffer(transactionData: Buffer): Promise<Contracts.Crypto.ITransaction> {
		try {
			const transactionCommon = {} as Contracts.Crypto.ITransactionData;
			const txByteBuffer = ByteBuffer.fromBuffer(transactionData);
			this.deserializer.deserializeCommon(transactionCommon, txByteBuffer);

			return this.transactionFactory.fromBytes(transactionData);
		} catch (error) {
			throw new Exceptions.InvalidTransactionDataError(error.message);
		}
	}

	private async getTransactionFromData(
		transactionData: Contracts.Crypto.ITransactionData,
	): Promise<Contracts.Crypto.ITransaction> {
		try {
			return this.transactionFactory.fromData(transactionData);
		} catch (error) {
			throw new Exceptions.InvalidTransactionDataError(error.message);
		}
	}
}
