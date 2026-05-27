import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";

@injectable()
export class WorkerPool implements Contracts.Crypto.WorkerPool {
	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "crypto-worker")
	private readonly configuration!: Contracts.Kernel.PluginConfiguration;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.CryptoWorker.Worker.Factory)
	private readonly createWorker!: Contracts.Crypto.WorkerFactory;

	private workers: Contracts.Crypto.Worker[] = [];

	@inject(Identifiers.Config.Flags)
	private readonly flags!: Contracts.Types.KeyValuePair;

	#currentWorkerIndex = 0;

	public async boot(): Promise<void> {
		const workerCount = this.configuration.getRequired<number>("workerCount");

		this.logger.info(`Booting up ${workerCount} crypto workers`);

		for (let index = 0; index < workerCount; index++) {
			const worker = this.createWorker();
			this.workers.push(worker);
		}

		await Promise.all(
			this.workers.map((worker) =>
				worker.boot({
					...this.flags,
					thread: "crypto-worker",
					workerLoggingEnabled: this.configuration.getRequired("workerLoggingEnabled"),
				}),
			),
		);
	}

	public async shutdown(): Promise<void> {
		await Promise.all(this.workers.map(async (worker) => await worker.kill()));
	}

	public async getWorker(): Promise<Contracts.Crypto.Worker> {
		// Pick the worker with the fewest in-flight requests. Scanning starts at a
		// rotating cursor and only replaces the pick on a strictly smaller queue, so
		// ties (e.g. all workers idle) fall back to round-robin and spread evenly.
		let selected = this.workers[this.#currentWorkerIndex];
		let smallestQueueSize = selected.getQueueSize();

		for (let offset = 1; offset < this.workers.length; offset++) {
			const worker = this.workers[(this.#currentWorkerIndex + offset) % this.workers.length];
			const queueSize = worker.getQueueSize();

			if (queueSize < smallestQueueSize) {
				selected = worker;
				smallestQueueSize = queueSize;
			}
		}

		this.#currentWorkerIndex = (this.#currentWorkerIndex + 1) % this.workers.length;

		return selected;
	}
}
