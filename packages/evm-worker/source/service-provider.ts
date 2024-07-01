import { inject } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Ipc, Providers } from "@mainsail/kernel";
import Joi from "joi";
import { Worker } from "worker_threads";

import { Worker as WorkerInstance } from "./worker.js";

export class ServiceProvider extends Providers.ServiceProvider {
	@inject(Identifiers.Config.Flags)
	private readonly flags!: Contracts.Types.KeyValuePair;

	public async register(): Promise<void> {
		this.app.bind(Identifiers.Evm.WorkerSubprocess.Factory).toFactory(() => () => {
			const subprocess = new Worker(`${new URL(".", import.meta.url).pathname}/worker-script.js`, {});
			return new Ipc.Subprocess(subprocess);
		});

		this.app.bind(Identifiers.Evm.Worker).toConstantValue(this.app.resolve(WorkerInstance));
	}

	public async boot(): Promise<void> {
		await this.app.get<Contracts.Evm.Worker>(Identifiers.Evm.Worker).boot({
			...this.flags,
			thread: "evm-api",
		});
	}

	public async dispose(): Promise<void> {
		await this.app.get<Contracts.Evm.Worker>(Identifiers.Evm.Worker).kill();
	}

	public async required(): Promise<boolean> {
		return true;
	}

	public configSchema(): Joi.AnySchema {
		return Joi.object({}).required().unknown(true);
	}
}
