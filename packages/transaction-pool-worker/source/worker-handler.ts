import { Container, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Application } from "@mainsail/kernel";

@injectable()
class WorkerImpl {
	// @ts-ignore
	#app: Contracts.Kernel.Application;
}

export class WorkerScriptHandler implements Contracts.TransactionPool.WorkerScriptHandler {
	// @ts-ignore
	#app: Contracts.Kernel.Application;

	// @ts-ignore
	#impl: WorkerImpl;

	public async boot(flags: Contracts.Crypto.WorkerFlags): Promise<void> {
		const app: Contracts.Kernel.Application = new Application(new Container());

		await app.bootstrap({
			flags,
		});

		// eslint-disable-next-line @typescript-eslint/await-thenable
		await app.boot();

		this.#app = app;

		this.#impl = app.resolve(WorkerImpl);
	}

	public async importSnapshot(height: number): Promise<void> {
		await this.#app.get<Contracts.State.Service>(Identifiers.State.Service).restore(height);
	}
}
