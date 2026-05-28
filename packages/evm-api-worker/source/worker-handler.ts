import type { Contracts } from "@mainsail/contracts";

import { Application } from "@mainsail/kernel";

import { CommitHandler, SetPeerCountHandler, StartHandler } from "./handlers/index.js";

export class WorkerScriptHandler implements Contracts.Evm.WorkerScriptHandler {
	#app = new Application();

	public async boot(flags: Contracts.Crypto.WorkerFlags): Promise<void> {
		await this.#app.bootstrap({
			flags,
		});

		await this.#app.boot();
	}

	public async dispose(): Promise<void> {
		await this.#app.terminate();
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
