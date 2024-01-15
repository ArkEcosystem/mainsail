import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { IpcWorker, Providers, Types } from "@mainsail/kernel";

@injectable()
export class WorkerPool implements IpcWorker.WorkerPool {
	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "crypto-worker")
	private readonly configuration!: Providers.PluginConfiguration;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.CryptoWorker.WorkerFactory)
	private readonly createWorker!: IpcWorker.WorkerFactory;

	private workers: IpcWorker.Worker[] = [];

	@inject(Identifiers.Config.Flags)
	private readonly flags!: Types.KeyValuePair;

	#currentWorkerIndex = 0;

	public async boot(): Promise<void> {
		const workerCount = this.configuration.getRequired<number>("workerCount");

		for (let index = 0; index < workerCount; index++) {
			const worker = this.createWorker();
			this.workers.push(worker);
		}

		this.logger.info(`Booting up ${this.workers.length} workers`);

		await Promise.all(
			this.workers.map((worker) =>
				worker.boot({
					...this.flags,
					workerLoggingEnabled: this.configuration.getRequired("workerLoggingEnabled"),
				}),
			),
		);
	}

	public async shutdown(signal?: number | NodeJS.Signals): Promise<void> {
		await Promise.all(this.workers.map((worker) => worker.kill(signal)));
	}

	public async getWorker(): Promise<IpcWorker.Worker> {
		const worker = this.workers[this.#currentWorkerIndex];
		this.#currentWorkerIndex = (this.#currentWorkerIndex + 1) % this.workers.length;

		return worker;
	}
}
