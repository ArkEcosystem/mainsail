import { inject, injectable, tagged } from "@mainsail/container";
import { Constants, Contracts, Events, Exceptions, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";
import { BigNumber, Lock } from "@mainsail/utils";

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

	@inject(Identifiers.TransactionPool.Broadcaster)
	private readonly broadcaster!: Contracts.TransactionPool.Broadcaster;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly cryptoConfiguration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.TransactionPool.Storage)
	private readonly storage!: Contracts.TransactionPool.Storage;

	@inject(Identifiers.TransactionPool.Mempool)
	private readonly mempool!: Contracts.TransactionPool.Mempool;

	@inject(Identifiers.TransactionPool.Query)
	private readonly poolQuery!: Contracts.TransactionPool.Query;

	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.Cryptography.Transaction.Factory)
	private readonly transactionFactory!: Contracts.Crypto.TransactionFactory;

	readonly #lock = new Lock();

	#disposed = false;

	public async boot(): Promise<void> {
		if (
			process.env[Constants.EnvironmentVariables.MAINSAIL_RESET_DATABASE] ||
			process.env[Constants.EnvironmentVariables.MAINSAIL_RESET_POOL]
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

	public async commit(sendersAddresses: string[], consumedGas: number): Promise<void> {
		await this.#lock.runExclusive(async () => {
			if (this.#disposed) {
				return;
			}

			const removedTransactions = await this.mempool.reAddTransactions(sendersAddresses);

			for (const transaction of removedTransactions) {
				this.storage.removeTransaction(transaction.hash);
				this.logger.debug(`Removed tx ${transaction.hash}`);
				void this.events.dispatch(Events.TransactionEvent.RemovedFromPool, transaction.data);
			}

			await this.#cleanUp();

			await this.#rebroadcastMempoolTransactions(consumedGas);
		});
	}

	public async addTransaction(transaction: Contracts.Crypto.Transaction): Promise<void> {
		await this.#lock.runNonExclusive(async () => {
			if (this.#disposed) {
				return;
			}

			if (this.storage.hasTransaction(transaction.hash)) {
				throw new Exceptions.TransactionAlreadyInPoolError(transaction);
			}

			this.storage.addTransaction({
				blockNumber: this.stateStore.getBlockNumber(),
				hash: transaction.hash,
				senderPublicKey: transaction.data.senderPublicKey,
				serialized: transaction.serialized,
			});

			try {
				await this.#addTransactionToMempool(transaction);
				this.logger.debug(`tx ${transaction.hash} added to pool`);

				void this.events.dispatch(Events.TransactionEvent.AddedToPool, transaction.data);
			} catch (error) {
				this.storage.removeTransaction(transaction.hash);
				this.logger.warning(`tx ${transaction.hash} failed to enter pool: ${error.message}`);

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
			const lastBlockNumber: number = this.stateStore.getBlockNumber();
			const expiredBlockNumber: number = lastBlockNumber - maxTransactionAge;

			for (const { blockNumber, hash, serialized } of this.storage.getAllTransactions()) {
				if (blockNumber > expiredBlockNumber) {
					try {
						const previouslyStoredTransaction = await this.transactionFactory.fromBytes(serialized);
						await this.#addTransactionToMempool(previouslyStoredTransaction);

						void this.events.dispatch(
							Events.TransactionEvent.AddedToPool,
							previouslyStoredTransaction.data,
						);

						previouslyStoredSuccesses++;
					} catch (error) {
						this.storage.removeTransaction(hash);
						this.logger.debug(`Failed to re-add previously stored tx ${hash}: ${error.message}`);

						previouslyStoredFailures++;
					}
				} else {
					this.storage.removeTransaction(hash);
					this.logger.debug(`Not re-adding previously stored expired tx ${hash}`);
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
		await this.#removeLowestPriorityTransactions();
	}

	async #removeOldTransactions(): Promise<void> {
		const maxTransactionAge: number = this.pluginConfiguration.getRequired<number>("maxTransactionAge");
		const lastBlockNumber: number = this.stateStore.getBlockNumber();
		const expiredBlockNumber: number = lastBlockNumber - maxTransactionAge;

		for (const { senderPublicKey, hash } of this.storage.getOldTransactions(expiredBlockNumber)) {
			const removedTransactions = await this.mempool.removeTransaction(
				await this.addressFactory.fromPublicKey(senderPublicKey),
				hash,
			);

			const removedTransactionHashes = new Set(removedTransactions.map(({ hash }) => hash));
			removedTransactionHashes.add(hash);

			for (const removedTransactionHash of removedTransactionHashes) {
				this.storage.removeTransaction(removedTransactionHash);
				this.logger.debug(`Removed old tx ${removedTransactionHash}`);

				void this.events.dispatch(Events.TransactionEvent.Expired, removedTransactionHash);
			}
		}
	}

	async #removeLowestPriorityTransaction(): Promise<void> {
		if (this.getPoolSize() === 0) {
			return;
		}

		const transaction = await this.poolQuery.getFromLowestPriority().first();

		const removedTransactions = await this.mempool.removeTransaction(transaction.data.from, transaction.hash);

		for (const removedTransaction of removedTransactions) {
			this.storage.removeTransaction(removedTransaction.hash);
			this.logger.debug(`Removed lowest priority tx ${removedTransaction.hash}`);
			void this.events.dispatch(Events.TransactionEvent.RemovedFromPool, removedTransaction.data);
		}
	}

	async #removeLowestPriorityTransactions(): Promise<void> {
		const maxTransactionsInPool: number = this.pluginConfiguration.getRequired<number>("maxTransactionsInPool");

		while (this.getPoolSize() > maxTransactionsInPool) {
			await this.#removeLowestPriorityTransaction();
		}
	}

	async #addTransactionToMempool(transaction: Contracts.Crypto.Transaction): Promise<void> {
		const maxTransactionsInPool: number = this.pluginConfiguration.getRequired<number>("maxTransactionsInPool");

		if (this.getPoolSize() >= maxTransactionsInPool) {
			await this.#cleanUp();
		}

		if (this.getPoolSize() >= maxTransactionsInPool) {
			const lowest = await this.poolQuery.getFromLowestPriority().first();
			if (BigNumber.make(transaction.data.gasPrice).isLessThanEqual(lowest.data.gasPrice)) {
				throw new Exceptions.TransactionPoolFullError(transaction, lowest.data.gasPrice);
			}

			await this.#removeLowestPriorityTransaction();
		}

		await this.mempool.addTransaction(transaction);
	}

	async #rebroadcastMempoolTransactions(consumedGas: number): Promise<void> {
		const blockNumber = this.stateStore.getBlockNumber();
		const milestones = this.cryptoConfiguration.getMilestone(blockNumber);

		const threshold = this.pluginConfiguration.getRequired<number>("rebroadcastThreshold");

		// If block is not full rebroadcast local transactions.
		if (consumedGas > milestones.block.maxGasLimit * (threshold / 100)) {
			return;
		}

		const limit = this.pluginConfiguration.getRequired<number>("maxTransactionsPerRequest");
		const broadcastTransactions: Contracts.Crypto.Transaction[] = [];

		const all = await this.poolQuery.getFromHighestPriority().all();
		for (const transaction of all) {
			broadcastTransactions.push(transaction);

			if (broadcastTransactions.length >= limit) {
				break;
			}
		}

		if (broadcastTransactions.length > 0) {
			this.logger.info(`Rebroadcasting ${broadcastTransactions.length} transaction(s) from storage`);

			this.broadcaster
				.broadcastTransactions(broadcastTransactions)
				.catch((error) => this.logger.error(error.stack));
		}
	}
}
