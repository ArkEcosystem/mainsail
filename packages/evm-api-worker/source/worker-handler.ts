import { Container } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { Application } from "@mainsail/kernel";

import { CommitHandler, SetPeerCountHandler, StartHandler } from "./handlers/index.js";

export class WorkerScriptHandler implements Contracts.Evm.WorkerScriptHandler {
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

	public async start(height: number): Promise<void> {
		await this.#app.resolve(StartHandler).handle(height);
	}

	public async setPeerCount(peerCount: number): Promise<void> {
		await this.#app.resolve(SetPeerCountHandler).handle(peerCount);
	}

	public async commit(height: number): Promise<void> {
		await this.#app.resolve(CommitHandler).handle(height);
	}
}
