import { inject, injectable, tagged } from "@mainsail/container";
import { Constants, Contracts, Events, Exceptions, Identifiers } from "@mainsail/contracts";
import { Providers, Utils } from "@mainsail/kernel";

@injectable()
export class Service implements Contracts.TransactionPool.Service {
	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "transaction-pool-service")
	private readonly pluginConfiguration!: Providers.PluginConfiguration;

	@inject(Identifiers.Cryptography.Identity.Address.Factory)
	@tagged("type", "wallet")
	private readonly addressFactory!: Contracts.Crypto.AddressFactory;

	@inject(Identifiers.State.Store)
	private readonly stateStore!: Contracts.State.Store;

	@inject(Identifiers.TransactionPool.Storage)
	private readonly storage!: Contracts.TransactionPool.Storage;

	@inject(Identifiers.TransactionPool.Mempool)
	private readonly mempool!: Contracts.TransactionPool.Mempool;

	@inject(Identifiers.TransactionPool.Query)
	private readonly poolQuery!: Contracts.TransactionPool.Query;

	@inject(Identifiers.TransactionPool.ExpirationService)
	private readonly expirationService!: Contracts.TransactionPool.ExpirationService;

	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Cryptography.Transaction.Factory)
	private readonly transactionFactory!: Contracts.Crypto.TransactionFactory;

	readonly #lock: Utils.Lock = new Utils.Lock();

	#disposed = false;

	public async boot(): Promise<void> {
		if (
			process.env[Constants.EnvironmentVariables.CORE_RESET_DATABASE] ||
			process.env[Constants.EnvironmentVariables.CORE_RESET_POOL]
		) {
			await this.flush();
		}
	}

	public dispose(): void {
		this.#disposed = true;
	}

	public getPoolSize(): number {
		return this.mempool.getSize();
	}

	public async commit(transactions: {transaction: Contracts.Crypto.Transaction, gasUsed: number}[]): Promise<void> {
		await this.#lock.runExclusive(async () => {
			if (this.#disposed) {
				return;
			}

			for (const forged of transactions) {
				const removedTransactions = await this.mempool.removeForgedTransaction(
					await this.addressFactory.fromPublicKey(forged.transaction.data.senderPublicKey),
					forged.transaction.id,
				);

				for (const transaction of removedTransactions) {
					this.storage.removeTransaction(transaction.id);
					this.logger.debug(`Removed forged tx ${transaction.id}`);
					void this.events.dispatch(Events.TransactionEvent.RemovedFromPool, transaction.data);
				}
			}

			await this.#cleanUp();
		});
	}

	public async addTransaction(transaction: Contracts.Crypto.Transaction): Promise<void> {
		await this.#lock.runNonExclusive(async () => {
			if (this.#disposed) {
				return;
			}

			if (this.storage.hasTransaction(transaction.id)) {
				throw new Exceptions.TransactionAlreadyInPoolError(transaction);
			}

			this.storage.addTransaction({
				height: this.stateStore.getHeight(),
				id: transaction.id,
				senderPublicKey: transaction.data.senderPublicKey,
				serialized: transaction.serialized,
			});

			try {
				// TODO: Check if can enter pool
				// await this.feeMatcher.throwIfCannotEnterPool(transaction);
				await this.#addTransactionToMempool(transaction);
				this.logger.debug(`tx ${transaction.id} added to pool`);

				void this.events.dispatch(Events.TransactionEvent.AddedToPool, transaction.data);
			} catch (error) {
				this.storage.removeTransaction(transaction.id);
				this.logger.warning(
					`tx ${transaction.id} (type: ${transaction.type}) failed to enter pool: ${error.message}`,
				);

				void this.events.dispatch(Events.TransactionEvent.RejectedByPool, transaction.data);

				throw error instanceof Exceptions.PoolError
					? error
					: new Exceptions.PoolError(error.message, "ERR_OTHER");
			}
		});
	}

	public async reAddTransactions(): Promise<void> {
		await this.#lock.runExclusive(async () => {
			if (this.#disposed) {
				return;
			}

			this.mempool.flush();

			let previouslyStoredSuccesses = 0;
			let previouslyStoredExpirations = 0;
			let previouslyStoredFailures = 0;

			const maxTransactionAge: number = this.pluginConfiguration.getRequired<number>("maxTransactionAge");
			const lastHeight: number = this.stateStore.getHeight();
			const expiredHeight: number = lastHeight - maxTransactionAge;

			for (const { height, id, serialized } of this.storage.getAllTransactions()) {
				if (height > expiredHeight) {
					try {
						const previouslyStoredTransaction = await this.transactionFactory.fromBytes(serialized);
						await this.#addTransactionToMempool(previouslyStoredTransaction);

						void this.events.dispatch(
							Events.TransactionEvent.AddedToPool,
							previouslyStoredTransaction.data,
						);

						previouslyStoredSuccesses++;
					} catch (error) {
						this.storage.removeTransaction(id);
						this.logger.debug(`Failed to re-add previously stored tx ${id}: ${error.message}`);

						previouslyStoredFailures++;
					}
				} else {
					this.storage.removeTransaction(id);
					this.logger.debug(`Not re-adding previously stored expired tx ${id}`);
					previouslyStoredExpirations++;
				}
			}

			if (previouslyStoredSuccesses >= 1) {
				this.logger.info(`${previouslyStoredSuccesses} previously stored transactions re-added`);
			}
			if (previouslyStoredExpirations >= 1) {
				this.logger.info(`${previouslyStoredExpirations} previously stored transactions expired`);
			}
			if (previouslyStoredFailures >= 1) {
				this.logger.warning(`${previouslyStoredFailures} previously stored transactions failed re-adding`);
			}
		});
	}

	public async flush(): Promise<void> {
		await this.#lock.runExclusive(async () => {
			if (this.#disposed) {
				return;
			}

			this.mempool.flush();
			this.storage.flush();
		});
	}

	async #cleanUp(): Promise<void> {
		await this.#removeOldTransactions();
		await this.#removeExpiredTransactions();
		await this.#removeLowestPriorityTransactions();
		await this.#fixInvalidStates();
	}

	async #removeOldTransactions(): Promise<void> {
		const maxTransactionAge: number = this.pluginConfiguration.getRequired<number>("maxTransactionAge");
		const lastHeight: number = this.stateStore.getHeight();
		const expiredHeight: number = lastHeight - maxTransactionAge;

		for (const { senderPublicKey, id } of this.storage.getOldTransactions(expiredHeight)) {
			const removedTransactions = await this.mempool.removeTransaction(
				await this.addressFactory.fromPublicKey(senderPublicKey),
				id,
			);

			for (const removedTransaction of removedTransactions) {
				this.storage.removeTransaction(removedTransaction.id);
				this.logger.debug(`Removed old tx ${removedTransaction.id}`);

				void this.events.dispatch(Events.TransactionEvent.Expired, removedTransaction.data);
			}
		}
	}

	async #removeExpiredTransactions(): Promise<void> {
		for (const transaction of await this.poolQuery.getAll().all()) {
			if (await this.expirationService.isExpired(transaction)) {
				const removedTransactions = await this.mempool.removeTransaction(
					await this.addressFactory.fromPublicKey(transaction.data.senderPublicKey),
					transaction.id,
				);

				for (const removedTransaction of removedTransactions) {
					this.storage.removeTransaction(removedTransaction.id);
					this.logger.debug(`Removed expired tx ${removedTransaction.id}`);
					void this.events.dispatch(Events.TransactionEvent.Expired, removedTransaction.data);
				}
			}
		}
	}

	async #removeLowestPriorityTransaction(): Promise<void> {
		if (this.getPoolSize() === 0) {
			return;
		}

		const transaction = await this.poolQuery.getFromLowestPriority().first();

		const removedTransactions = await this.mempool.removeTransaction(
			await this.addressFactory.fromPublicKey(transaction.data.senderPublicKey),
			transaction.id,
		);

		for (const removedTransaction of removedTransactions) {
			this.storage.removeTransaction(removedTransaction.id);
			this.logger.debug(`Removed lowest priority tx ${removedTransaction.id}`);
			void this.events.dispatch(Events.TransactionEvent.RemovedFromPool, removedTransaction.data);
		}
	}

	async #removeLowestPriorityTransactions(): Promise<void> {
		const maxTransactionsInPool: number = this.pluginConfiguration.getRequired<number>("maxTransactionsInPool");

		while (this.getPoolSize() > maxTransactionsInPool) {
			await this.#removeLowestPriorityTransaction();
		}
	}

	async #fixInvalidStates(): Promise<void> {
		const transactions = await this.mempool.fixInvalidStates();

		for (const transaction of transactions) {
			this.storage.removeTransaction(transaction.id);
			this.logger.debug(`Removed invalid tx ${transaction.id}`);

			void this.events.dispatch(Events.TransactionEvent.RemovedFromPool, transaction.data);
		}
	}

	async #addTransactionToMempool(transaction: Contracts.Crypto.Transaction): Promise<void> {
		const maxTransactionsInPool: number = this.pluginConfiguration.getRequired<number>("maxTransactionsInPool");

		if (this.getPoolSize() >= maxTransactionsInPool) {
			await this.#cleanUp();
		}

		if (this.getPoolSize() >= maxTransactionsInPool) {
			const lowest = await this.poolQuery.getFromLowestPriority().first();
			if (transaction.data.fee.isLessThanEqual(lowest.data.fee)) {
				throw new Exceptions.TransactionPoolFullError(transaction, lowest.data.fee);
			}

			await this.#removeLowestPriorityTransaction();
			await this.#fixInvalidStates();
		}

		await this.mempool.addTransaction(transaction);
	}
}
