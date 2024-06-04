import { Container } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { Application } from "@mainsail/kernel";

import {
	CommitHandler,
	ForgetPeerHandler,
	GetTransactionsHandler,
	ImportSnapshotHandler,
	SetPeerHandler,
} from "./handlers/index.js";

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
		await this.#app.resolve(ImportSnapshotHandler).handle(height);
	}

	public async commit(data: {
		block: string;
		failedTransactions: string[];
		store: Contracts.State.StoreChange;
	}): Promise<void> {
		await this.#app.resolve(CommitHandler).handle(data);
	}

	public async getTransactions(): Promise<string[]> {
		return await this.#app.resolve(GetTransactionsHandler).handle();
	}

	public async setPeer(ip: string): Promise<void> {
		return await this.#app.resolve(SetPeerHandler).handle(ip);
	}

	public async forgetPeer(ip: string): Promise<void> {
		return await this.#app.resolve(ForgetPeerHandler).handle(ip);
	}
}
