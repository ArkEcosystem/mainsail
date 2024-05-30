import { Container, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Application, Services } from "@mainsail/kernel";

@injectable()
class WorkerImpl {}

// @ts-ignore
export class WorkerScriptHandler implements Contracts.Crypto.WorkerScriptHandler {
	// @ts-ignore
	#app: Contracts.Kernel.Application;

	// @ts-ignore
	#impl: WorkerImpl;

	public async boot(flags: Contracts.Crypto.WorkerFlags): Promise<void> {
		const app: Contracts.Kernel.Application = new Application(new Container());

		app.config("worker", true);

		await app.bootstrap({
			flags,
		});

		if (!flags.workerLoggingEnabled) {
			app.rebind(Identifiers.Services.Log.Service).to(Services.Log.NullLogger);
		}

		// eslint-disable-next-line @typescript-eslint/await-thenable
		await app.boot();

		this.#app = app;

		this.#impl = app.resolve(WorkerImpl);
	}
}
