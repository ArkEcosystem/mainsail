import type { Contracts } from "@mainsail/contracts";

import { Application } from "@mainsail/kernel";

import {
	CommitHandler,
	ForgetPeerHandler,
	GetTransactionsHandler,
	ReloadWebhooksHandler,
	RemoveTransactionHandler,
	SetPeerHandler,
	StartHandler,
} from "./handlers/index.js";

export class WorkerScriptHandler implements Contracts.TransactionPool.WorkerScriptHandler {
	#app = new Application();

	public async boot(flags: Contracts.Crypto.WorkerFlags): Promise<void> {

		await this.#app.bootstrap({
			flags,
		});

		await this.#app.boot();
	}

	public async dispose(): Promise<void> {
		await this.#app.dispose();
	}

	public async start(height: number): Promise<void> {
		await this.#app.resolve(StartHandler).handle(height);
	}

	public async commit(
		height: number,
		sendersAddresses: string[],
		consumedGas: number,
		isSyncing: boolean,
	): Promise<void> {
		await this.#app.resolve(CommitHandler).handle(height, sendersAddresses, consumedGas, isSyncing);
	}

	public async getTransactions(
		options: Contracts.TransactionPool.GetBatchOptions,
	): Promise<Contracts.TransactionPool.GetBatchResult> {
		return await this.#app.resolve(GetTransactionsHandler).handle(options);
	}

	public async removeTransaction(address: string, id: string): Promise<void> {
		await this.#app.resolve(RemoveTransactionHandler).handle(address, id);
	}

	public async setPeer(ip: string): Promise<void> {
		return await this.#app.resolve(SetPeerHandler).handle(ip);
	}

	public async forgetPeer(ip: string): Promise<void> {
		return await this.#app.resolve(ForgetPeerHandler).handle(ip);
	}

	public async reloadWebhooks(): Promise<void> {
		await this.#app.resolve(ReloadWebhooksHandler).handle();
	}
}
