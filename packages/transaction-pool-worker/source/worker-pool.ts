import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Types } from "@mainsail/kernel";

@injectable()
export class WorkerPool implements Contracts.TransactionPool.WorkerPool {
	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.TransactionPoolWorker.Worker.Factory)
	private readonly createWorker!: Contracts.Crypto.WorkerFactory;

	private workers: Contracts.TransactionPool.Worker[] = [];

	@inject(Identifiers.Config.Flags)
	private readonly flags!: Types.KeyValuePair;

	#currentWorkerIndex = 0;

	public async boot(): Promise<void> {
		const workerCount = 1;

		for (let index = 0; index < workerCount; index++) {
			const worker = this.createWorker();
			this.workers.push(worker);
		}

		this.logger.info(`Booting up ${this.workers.length} transaction pool workers`);

		await Promise.all(
			this.workers.map((worker) =>
				worker.boot({
					...this.flags,
					thread: "transaction-pool",
					// workerLoggingEnabled: this.configuration.getRequired("workerLoggingEnabled"),
					workerLoggingEnabled: true,
				}),
			),
		);
	}

	public async shutdown(): Promise<void> {
		await Promise.all(this.workers.map(async (worker) => await worker.kill()));
	}

	public async getWorker(): Promise<Contracts.TransactionPool.Worker> {
		const worker = this.workers[this.#currentWorkerIndex];
		this.#currentWorkerIndex = (this.#currentWorkerIndex + 1) % this.workers.length;

		return worker;
	}
}
