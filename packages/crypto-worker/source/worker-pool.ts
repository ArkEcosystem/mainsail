import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable, tagged } from "@mainsail/container";

// Boot this many workers synchronously before the pool is considered ready; the rest are
// created and booted in the background after boot() returns, so they don't block the node
// from reaching P2P/consensus. Kept > 1 so genesis deserialization (which fans the genesis
// transactions across the pool) isn't funneled through a single worker on cold start.
const EAGER_WORKER_COUNT = 2;

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

	// Booted workers handed out by getWorker(). A worker only lands here once its boot() has
	// resolved, so getWorker() never returns a worker whose in-worker app isn't ready yet.
	#workers: Contracts.Crypto.Worker[] = [];
	// Every worker spawned (booted or still booting in the background), so dispose() can tear
	// them all down even if the background growth hasn't finished.
	#allWorkers: Contracts.Crypto.Worker[] = [];
	#currentWorkerIndex = 0;
	#growth?: Promise<void>;
	#disposed = false;

	public async boot(): Promise<void> {
		const workerCount = this.configuration.getRequired<number>("workerCount");
		const eagerCount = Math.min(EAGER_WORKER_COUNT, workerCount);

		this.logger.info(`Booting up ${eagerCount}/${workerCount} crypto workers (remaining in background)`);

		// Boot the eager subset on the critical path so the pool is usable immediately.
		await Promise.all(Array.from({ length: eagerCount }, () => this.#spawnWorker()));

		// Bring the rest online in the background; they join the pool as they finish booting.
		if (workerCount > eagerCount && !this.#disposed) {
			this.#growth = this.#growPool(workerCount - eagerCount);
		}
	}

	public async dispose(): Promise<void> {
		this.#disposed = true;

		// Let any in-flight background boots settle so they don't spawn threads after teardown.
		await this.whenReady().catch(() => {});

		const workers = this.#allWorkers;
		this.#allWorkers = [];
		this.#workers = [];
		await Promise.all(workers.map(async (worker) => await worker.dispose()));
	}

	// Resolves once the background-grown workers have all booted (or failed to). Awaited by
	// dispose() so teardown waits out in-flight boots, and by tests; never awaited on the
	// startup critical path.
	public async whenReady(): Promise<void> {
		if (this.#growth) {
			await this.#growth;
		}
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

	async #growPool(count: number): Promise<void> {
		// Sequentially, so the background boots don't all contend for cores at once
		for (let index = 0; index < count; index++) {
			if (this.#disposed) {
				return;
			}

			try {
				await this.#spawnWorker();
			} catch (error) {
				this.logger.warn(`Failed to boot background crypto worker: ${(error as Error).message}`);
			}
		}
	}

	async #spawnWorker(): Promise<void> {
		const worker = this.createWorker();
		this.#allWorkers.push(worker);

		await worker.boot({
			...this.flags,
			thread: "crypto-worker",
			workerLoggingEnabled: this.configuration.getRequired("workerLoggingEnabled"),
		});

		if (!this.#disposed) {
			this.#workers.push(worker);
		}
	}
}
