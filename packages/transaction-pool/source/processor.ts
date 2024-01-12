import { inject, injectable, multiInject, optional } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";

@injectable()
export class Processor implements Contracts.TransactionPool.Processor {
	@multiInject(Identifiers.TransactionPool.ProcessorExtension)
	@optional()
	private readonly extensions: Contracts.TransactionPool.ProcessorExtension[] = [];

	@inject(Identifiers.TransactionPool.Service)
	private readonly pool!: Contracts.TransactionPool.Service;

	@inject(Identifiers.PeerBroadcaster)
	@optional()
	private readonly broadcaster!: Contracts.P2P.Broadcaster | undefined;

	@inject(Identifiers.Kernel.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Cryptography.Transaction.Factory)
	private readonly transactionFactory!: Contracts.Crypto.TransactionFactory;

	public async process(data: Buffer[]): Promise<Contracts.TransactionPool.ProcessorResult> {
		const accept: string[] = [];
		const broadcast: string[] = [];
		const invalid: string[] = [];
		const excess: string[] = [];
		let errors: { [id: string]: Contracts.TransactionPool.ProcessorError } | undefined;

		const broadcastTransactions: Contracts.Crypto.Transaction[] = [];

		try {
			for (const [index, transactionData] of data.entries()) {
				const entryId = String(index);

				try {
					const transaction = await this.#getTransactionFromBuffer(transactionData);

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

	async #getTransactionFromBuffer(transactionData: Buffer): Promise<Contracts.Crypto.Transaction> {
		try {
			return this.transactionFactory.fromBytes(transactionData);
		} catch (error) {
			throw new Exceptions.InvalidTransactionDataError(error.message);
		}
	}
}
