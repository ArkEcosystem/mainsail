import Contracts, { Crypto, Identifiers } from "@arkecosystem/core-contracts";
import { Container, Providers } from "@arkecosystem/core-kernel";

@Container.injectable()
export class WorkerPool implements Contracts.TransactionPool.WorkerPool {
	@Container.inject(Identifiers.TransactionPoolWorkerFactory)
	private readonly createWorker!: Contracts.TransactionPool.WorkerFactory;

	@Container.inject(Identifiers.PluginConfiguration)
	@Container.tagged("plugin", "core-transaction-pool")
	private readonly pluginConfiguration!: Providers.PluginConfiguration;

	private workers: Contracts.TransactionPool.Worker[] = [];

	@Container.postConstruct()
	public initialize() {
		const workerCount: number = this.pluginConfiguration.getRequired("workerPool.workerCount");

		for (let index = 0; index < workerCount; index++) {
			this.workers.push(this.createWorker());
		}
	}

	public async getTransactionFromData(
		transactionData: Crypto.ITransactionData | Buffer,
	): Promise<Crypto.ITransaction> {
		const worker: Contracts.TransactionPool.Worker = this.workers.reduce((previous, next) => {
			if (previous.getQueueSize() < next.getQueueSize()) {
				return previous;
			}

			return next;
		});

		return worker.getTransactionFromData(transactionData);
	}
}
