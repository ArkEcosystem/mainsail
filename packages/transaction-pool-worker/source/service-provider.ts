import { Contracts, Identifiers } from "@mainsail/contracts";
import { Ipc, Providers } from "@mainsail/kernel";
import Joi from "joi";
import { Worker } from "worker_threads";

import { Worker as WorkerInstance } from "./worker.js";
import { WorkerPool } from "./worker-pool.js";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.TransactionPoolWorker.Worker.Instance).to(WorkerInstance);
		this.app
			.bind(Identifiers.TransactionPoolWorker.Worker.Factory)
			.toAutoFactory(Identifiers.TransactionPoolWorker.Worker.Instance);

		this.app.bind(Identifiers.TransactionPoolWorker.WorkerSubprocess.Factory).toFactory(() => () => {
			const subprocess = new Worker(`${new URL(".", import.meta.url).pathname}/worker-script.js`, {});
			return new Ipc.Subprocess(subprocess);
		});

		this.app.bind(Identifiers.TransactionPoolWorker.WorkerPool).to(WorkerPool).inSingletonScope();
	}

	public async boot(): Promise<void> {
		await this.app.get<Contracts.TransactionPool.WorkerPool>(Identifiers.TransactionPoolWorker.WorkerPool).boot();
	}

	public async dispose(): Promise<void> {
		await this.app
			.get<Contracts.TransactionPool.WorkerPool>(Identifiers.TransactionPoolWorker.WorkerPool)
			.shutdown();
	}

	public async required(): Promise<boolean> {
		return true;
	}

	public configSchema(): Joi.AnySchema {
		return Joi.object({}).required().unknown(true);
	}
}
