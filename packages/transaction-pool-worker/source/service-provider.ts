import { Identifiers } from "@mainsail/contracts";
import { Ipc, Providers } from "@mainsail/kernel";
import Joi from "joi";
import { Worker } from "worker_threads";

import { Worker as WorkerInstance } from "./worker.js";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.TransactionPoolWorker.Worker.Instance).to(WorkerInstance);
		this.app
			.bind(Identifiers.TransactionPoolWorker.Worker.Factory)
			.toAutoFactory(Identifiers.CryptoWorker.Worker.Instance);

		this.app.bind(Identifiers.TransactionPoolWorker.WorkerSubprocess.Factory).toFactory(() => () => {
			const subprocess = new Worker(`${new URL(".", import.meta.url).pathname}/worker-script.js`, {});
			return new Ipc.Subprocess(subprocess);
		});
	}

	public configSchema(): Joi.AnySchema {
		return Joi.object({}).required().unknown(true);
	}
}
