import { inject, injectable, postConstruct, tagged } from "@arkecosystem/core-container";
import Contracts, { Crypto, Identifiers } from "@arkecosystem/core-contracts";
import { Providers } from "@arkecosystem/core-kernel";

@injectable()
export class WorkerPool implements Contracts.TransactionPool.WorkerPool {
	@inject(Identifiers.TransactionPoolWorkerFactory)
	private readonly createWorker!: Contracts.TransactionPool.WorkerFactory;

	@inject(Identifiers.PluginConfiguration)
	@tagged("plugin", "core-transaction-pool")
	private readonly pluginConfiguration!: Providers.PluginConfiguration;

	private workers: Contracts.TransactionPool.Worker[] = [];

	@postConstruct()
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
