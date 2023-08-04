import { inject, injectable, multiInject, optional } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { ByteBuffer } from "@mainsail/utils";

@injectable()
export class Processor implements Contracts.TransactionPool.Processor {
	@multiInject(Identifiers.TransactionPoolProcessorExtension)
	@optional()
	private readonly extensions: Contracts.TransactionPool.ProcessorExtension[] = [];

	@inject(Identifiers.TransactionPoolService)
	private readonly pool!: Contracts.TransactionPool.Service;

	@inject(Identifiers.PeerBroadcaster)
	@optional()
	private readonly broadcaster!: Contracts.P2P.Broadcaster | undefined;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Cryptography.Transaction.Factory)
	private readonly transactionFactory!: Contracts.Crypto.ITransactionFactory;

	@inject(Identifiers.Cryptography.Transaction.Deserializer)
	private readonly deserializer!: Contracts.Crypto.ITransactionDeserializer;

	public async process(
		data: Contracts.Crypto.ITransactionJson[] | Buffer[],
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
							? await this.#getTransactionFromBuffer(transactionData)
							: await this.#getTransactionFromJson(transactionData);
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
			if (this.broadcaster && broadcastTransactions.length > 0) {
				this.broadcaster
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

	async #getTransactionFromBuffer(transactionData: Buffer): Promise<Contracts.Crypto.ITransaction> {
		try {
			const transactionCommon = {} as Contracts.Crypto.ITransactionData;
			const txByteBuffer = ByteBuffer.fromBuffer(transactionData);
			this.deserializer.deserializeCommon(transactionCommon, txByteBuffer);

			return this.transactionFactory.fromBytes(transactionData);
		} catch (error) {
			throw new Exceptions.InvalidTransactionDataError(error.message);
		}
	}

	async #getTransactionFromJson(
		transactionData: Contracts.Crypto.ITransactionJson,
	): Promise<Contracts.Crypto.ITransaction> {
		try {
			return this.transactionFactory.fromJson(transactionData);
		} catch (error) {
			throw new Exceptions.InvalidTransactionDataError(error.message);
		}
	}
}
