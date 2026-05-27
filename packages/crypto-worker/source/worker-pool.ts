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

	@inject(Identifiers.Config.Flags)
	private readonly flags!: Contracts.Types.KeyValuePair;

	#workers: Contracts.Crypto.Worker[] = [];
	#currentWorkerIndex = 0;

	public async boot(): Promise<void> {
		const workerCount = this.configuration.getRequired<number>("workerCount");

		this.logger.info(`Booting up ${workerCount} crypto workers`);

		const workers: Contracts.Crypto.Worker[] = [];

		for (let index = 0; index < workerCount; index++) {
			const worker = this.createWorker();
			workers.push(worker);
		}

		await Promise.all(
			workers.map((worker) =>
				worker.boot({
					...this.flags,
					thread: "crypto-worker",
					workerLoggingEnabled: this.configuration.getRequired("workerLoggingEnabled"),
				}),
			),
		);

		this.#workers = workers;
	}

	public async shutdown(): Promise<void> {
		const workers = this.#workers;
		this.#workers = [];
		await Promise.all(workers.map(async (worker) => await worker.kill()));
	}

	public getWorker(): Contracts.Crypto.Worker {
		const workers = this.#workers.filter((worker) => !worker.isStopped());

		if (workers.length === 0) {
			throw new Error("No crypto workers available");
		}

		// Eviction may have shrunk the pool past the cursor; bring it back in range.
		this.#currentWorkerIndex %= workers.length;

		// Pick the worker with the fewest in-flight requests. Scanning starts at a
		// rotating cursor and only replaces the pick on a strictly smaller queue, so
		// ties (e.g. all workers idle) fall back to round-robin and spread evenly.
		let selected = workers[this.#currentWorkerIndex];
		let smallestQueueSize = selected.getQueueSize();

		for (let offset = 1; offset < workers.length; offset++) {
			const worker = workers[(this.#currentWorkerIndex + offset) % workers.length];
			const queueSize = worker.getQueueSize();

			if (queueSize < smallestQueueSize) {
				selected = worker;
				smallestQueueSize = queueSize;
			}
		}

		this.#currentWorkerIndex = (this.#currentWorkerIndex + 1) % workers.length;

		return selected;
	}
}
