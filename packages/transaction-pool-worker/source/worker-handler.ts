import { Container } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Application } from "@mainsail/kernel";

import { CommitHandler } from "./handlers/index.js";

export class WorkerScriptHandler implements Contracts.TransactionPool.WorkerScriptHandler {
	// @ts-ignore
	#app: Contracts.Kernel.Application;

	public async boot(flags: Contracts.Crypto.WorkerFlags): Promise<void> {
		const app: Contracts.Kernel.Application = new Application(new Container());

		await app.bootstrap({
			flags,
		});

		// eslint-disable-next-line @typescript-eslint/await-thenable
		await app.boot();
		this.#app = app;
	}

	public async importSnapshot(height: number): Promise<void> {
		await this.#app.get<Contracts.State.Service>(Identifiers.State.Service).restore(height);
	}

	public async commit(data: Contracts.TransactionPool.Actions.CommitRequest): Promise<void> {
		await this.#app.resolve(CommitHandler).handle(data);
	}

	public async getTransactionBytes(): Promise<Buffer[]> {
		return [];
	}
}
