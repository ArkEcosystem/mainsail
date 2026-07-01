import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { Ipc, Providers } from "@mainsail/kernel";
import { fileURLToPath } from "url";
import { Worker } from "worker_threads";

import { Worker as WorkerInstance } from "./worker.js";

@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	@inject(Identifiers.Config.Flags)
	private readonly flags!: Contracts.Types.KeyValuePair;

	public async register(): Promise<void> {
		this.app.bind<() => Ipc.Subprocess>(Identifiers.Evm.WorkerSubprocess.Factory).toFactory(() => () => {
			const subprocess = new Worker(fileURLToPath(new URL("worker-script.js", import.meta.url)), {
				stderr: true,
				stdout: true,
			});
			return new Ipc.Subprocess(this.app, "evm-api", "api", subprocess);
		});

		this.app.bind(Identifiers.Evm.Worker).toConstantValue(this.app.resolve(WorkerInstance));
	}

	public async boot(): Promise<void> {
		// API-only worker; nothing on the consensus/P2P path depends on it at boot, so don't
		// block startup on its full kernel bootstrap. Endpoints come online shortly after.
		void this.app
			.get<Contracts.Evm.Worker>(Identifiers.Evm.Worker)
			.boot({
				...this.flags,
				thread: "evm-api",
			})
			.catch((error) => this.app.terminate("evm-api worker failed to boot", error));
	}

	public async dispose(): Promise<void> {
		await this.app.get<Contracts.Evm.Worker>(Identifiers.Evm.Worker).dispose();
	}
}
