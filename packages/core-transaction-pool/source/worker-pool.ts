import { Container, Contracts, Providers } from "@arkecosystem/core-kernel";
import { Interfaces } from "@arkecosystem/crypto";

@Container.injectable()
export class WorkerPool implements Contracts.TransactionPool.WorkerPool {
	@Container.inject(Container.Identifiers.TransactionPoolWorkerFactory)
	private readonly createWorker!: Contracts.TransactionPool.WorkerFactory;

	@Container.inject(Container.Identifiers.PluginConfiguration)
	@Container.tagged("plugin", "core-transaction-pool")
	private readonly pluginConfiguration!: Providers.PluginConfiguration;

	private workers: Contracts.TransactionPool.Worker[] = [];

	@Container.postConstruct()
	public initialize() {
		const workerCount: number = this.pluginConfiguration.getRequired("workerPool.workerCount");

		for (let i = 0; i < workerCount; i++) {
			this.workers.push(this.createWorker());
		}
	}

	public async getTransactionFromData(
		transactionData: Interfaces.ITransactionData | Buffer,
	): Promise<Interfaces.ITransaction> {
		const worker: Contracts.TransactionPool.Worker = this.workers.reduce((prev, next) => {
			if (prev.getQueueSize() < next.getQueueSize()) {
				return prev;
			}

			return next;
		});

		return worker.getTransactionFromData(transactionData);
	}
}
