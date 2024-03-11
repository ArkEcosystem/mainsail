import { Identifiers } from "@mainsail/contracts";
import { Ipc, IpcWorker, Providers } from "@mainsail/kernel";
import { fork } from "child_process";
import Joi from "joi";
import { cpus } from "os";
import path from "path";
import { fileURLToPath } from "url";

import { Worker } from "./worker.js";
import { WorkerPool } from "./worker-pool.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		this.app.bind(Identifiers.CryptoWorker.Worker.Instance).to(Worker);
		this.app.bind(Identifiers.CryptoWorker.WorkerPool).to(WorkerPool).inSingletonScope();

		this.app.bind(Identifiers.CryptoWorker.WorkerSubprocess.Factory).toFactory(() => () => {
			const subprocess = fork(`${__dirname}/worker-script.js`, {});
			return new Ipc.Subprocess(subprocess);
		});

		this.app.bind(Identifiers.CryptoWorker.Worker.Factory).toAutoFactory(Identifiers.CryptoWorker.Worker.Instance);
	}

	public async boot(): Promise<void> {
		await this.app.get<IpcWorker.WorkerPool>(Identifiers.CryptoWorker.WorkerPool).boot();
	}

	public async dispose(): Promise<void> {
		await this.app.get<IpcWorker.WorkerPool>(Identifiers.CryptoWorker.WorkerPool).shutdown();
	}

	public async required(): Promise<boolean> {
		return true;
	}

	public configSchema(): Joi.AnySchema {
		return Joi.object({
			workerCount: Joi.number().integer().min(1).max(cpus().length).required(),
			workerLoggingEnabled: Joi.bool().required(),
		}).unknown(true);
	}
}
