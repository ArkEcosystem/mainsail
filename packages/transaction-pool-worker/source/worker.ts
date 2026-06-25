import type { Contracts } from "@mainsail/contracts";

import { Events, Identifiers } from "@mainsail/constants";
import { inject, injectable, postConstruct } from "@mainsail/container";
import dayjs from "dayjs";

@injectable()
export class Worker implements Contracts.TransactionPool.Worker {
	@inject(Identifiers.TransactionPool.WorkerSubprocess.Factory)
	private readonly createWorkerSubprocess!: Contracts.Kernel.IPC.SubprocessFactory;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly eventDispatcher!: Contracts.Kernel.EventDispatcher;

	private ipcSubprocess!: Contracts.Kernel.IPC.Subprocess;

	#bootPromise?: Promise<void>;
	#disposePromise?: Promise<void>;

	@postConstruct()
	public initialize(): void {
		this.ipcSubprocess = this.createWorkerSubprocess();

		this.eventDispatcher.listen(Events.WebhookEvent.Created, this);
		this.eventDispatcher.listen(Events.WebhookEvent.Updated, this);
		this.eventDispatcher.listen(Events.WebhookEvent.Removed, this);
	}

	public async handle(payload: { name: string; data: unknown }): Promise<void> {
		await this.reloadWebhooks();
	}

	public registerEventHandler<T>(event: string, callback: Contracts.Kernel.IPC.EventCallback<T>): void {
		this.ipcSubprocess.registerEventHandler(event, callback);
	}

	public async boot(flags: Contracts.TransactionPool.WorkerFlags): Promise<void> {
		if (!this.#bootPromise) {
			this.#bootPromise = this.ipcSubprocess.sendRequest("boot", flags);
		}

		await this.#bootPromise;
	}

	public async dispose(): Promise<void> {
		if (!this.#disposePromise) {
			this.#disposePromise = this.#doDispose();
		}

		await this.#disposePromise;
	}

	async #doDispose(): Promise<void> {
		// Let any work already in flight finish before tearing the worker down, so the
		// dispose doesn't cut off requests that other service providers issued before us.
		await this.ipcSubprocess.drain();

		try {
			await this.ipcSubprocess.sendRequest("dispose");
		} catch {
			// Worker may have died mid-dispose; we still need to terminate the thread.
		}

		// Graceful inner shutdown is done; now terminate the worker thread so it doesn't hang
		// around with an open parentPort listener. After this, isStopped() === true.
		await this.ipcSubprocess.dispose();
	}

	public async kill(): Promise<number> {
		return this.ipcSubprocess.kill();
	}

	public getQueueSize(): number {
		return this.ipcSubprocess.getQueueSize();
	}

	async onCommit(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		const sendersAddresses: Set<string> = new Set();

		const block = unit.getBlock();
		for (const transaction of block.transactions) {
			sendersAddresses.add(transaction.from);
		}

		// TODO: get syncing status from p2p service
		const nowMs = dayjs().valueOf();
		const { blockTime } = this.configuration.getMilestone().timeouts;
		const isSyncing = block.timestamp < nowMs - blockTime * 3;

		await this.#send("commit", unit.blockNumber, [...sendersAddresses.keys()], block.gasUsed, isSyncing);
	}

	public async start(blockNumber: number): Promise<void> {
		await this.#send("start", blockNumber);
	}

	public async getTransactions(
		options: Contracts.TransactionPool.GetBatchOptions,
	): Promise<Contracts.TransactionPool.GetBatchResult> {
		return this.#send("getTransactions", options);
	}

	public async removeTransaction(address: string, id: string): Promise<void> {
		await this.#send("removeTransaction", address, id);
	}

	public async setPeer(ip: string): Promise<void> {
		await this.#send("setPeer", ip);
	}

	public async forgetPeer(ip: string): Promise<void> {
		await this.#send("forgetPeer", ip);
	}

	public async reloadWebhooks(): Promise<void> {
		await this.#send("reloadWebhooks");
	}

	async #send<T>(method: string, ...arguments_: unknown[]): Promise<T> {
		if (!this.#bootPromise) {
			throw new Error("worker request issued before boot()");
		}

		await this.#bootPromise;

		return this.ipcSubprocess.sendRequest<T>(method, ...arguments_);
	}
}
