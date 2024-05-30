import { Container, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Application, IpcWorker, Services } from "@mainsail/kernel";

@injectable()
class WorkerImpl {}

export class WorkerScriptHandler implements IpcWorker.WorkerScriptHandler {
	// @ts-ignore
	#app: Contracts.Kernel.Application;

	// @ts-ignore
	#impl: WorkerImpl;

	public async boot(flags: IpcWorker.WorkerFlags): Promise<void> {
		const app: Contracts.Kernel.Application = new Application(new Container());

		// TODO: remove this once we have a proper way to handle this
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
