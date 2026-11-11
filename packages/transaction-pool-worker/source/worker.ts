import type { Contracts } from "@mainsail/contracts";

import { Events, Identifiers } from "@mainsail/constants";
import { inject, injectable, postConstruct } from "@mainsail/container";
import dayjs from "dayjs";

const COMMIT_TIMEOUT = 30_000;

@injectable()
export class Worker implements Contracts.TransactionPool.Worker {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.TransactionPool.WorkerSubprocess.Factory)
	private readonly createWorkerSubprocess!: Contracts.Kernel.IPC.SubprocessFactory;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly eventDispatcher!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	private ipcSubprocess!: Contracts.Kernel.IPC.Subprocess;

	readonly #eventHandlers = new Map<string, Contracts.Kernel.IPC.EventCallback<unknown>>();
	#flags?: Contracts.TransactionPool.WorkerFlags;
	#blockNumber?: number;
	#started = false;
	#stopping = false;
	#respawning = false;
	#bootPromise?: Promise<void>;
	#respawnPromise?: Promise<void>;
	#commitPromise: Promise<void> = Promise.resolve();
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
		this.#eventHandlers.set(event, callback as Contracts.Kernel.IPC.EventCallback<unknown>);
		this.ipcSubprocess.registerEventHandler(event, callback);
	}

	public async boot(flags: Contracts.TransactionPool.WorkerFlags): Promise<void> {
		if (!this.#bootPromise) {
			this.#flags = flags;
			this.#bootPromise = this.ipcSubprocess.sendRequest("boot", flags);
		}

		await this.#bootPromise;
	}

	public async dispose(): Promise<void> {
		this.#stopping = true;

		if (!this.#disposePromise) {
			this.#disposePromise = this.#doDispose();
		}

		await this.#disposePromise;
	}

	async #doDispose(): Promise<void> {
		await this.#respawnPromise;

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
		this.#stopping = true;

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

		this.#blockNumber = unit.blockNumber;

		const previous = this.#commitPromise;
		this.#commitPromise = previous.then(() =>
			this.#commit(unit.blockNumber, [...sendersAddresses.keys()], block.gasUsed, isSyncing),
		);

		await previous;
	}

	public async start(blockNumber: number): Promise<void> {
		this.#blockNumber = blockNumber;
		await this.#commitPromise;
		await this.#send("start", blockNumber);
		this.#started = true;
	}

	public async getTransactions(
		options: Contracts.TransactionPool.GetBatchOptions,
	): Promise<Contracts.TransactionPool.GetBatchResult> {
		await this.#commitPromise;

		const batch = await this.#sendIfRunning<Contracts.TransactionPool.GetBatchResult>("getTransactions", options);

		return batch ?? { remaining: 0, transactions: [] };
	}

	public async removeTransaction(address: string, id: string): Promise<void> {
		await this.#sendIfRunning("removeTransaction", address, id);
	}

	public async setPeer(ip: string): Promise<void> {
		await this.#sendIfRunning("setPeer", ip);
	}

	public async forgetPeer(ip: string): Promise<void> {
		await this.#sendIfRunning("forgetPeer", ip);
	}

	public async reloadWebhooks(): Promise<void> {
		await this.#sendIfRunning("reloadWebhooks");
	}

	async #commit(
		blockNumber: number,
		sendersAddresses: string[],
		consumedGas: number,
		isSyncing: boolean,
	): Promise<void> {
		const timeout = setTimeout(() => this.#respawn(), COMMIT_TIMEOUT);

		try {
			await this.#sendIfRunning("commit", blockNumber, sendersAddresses, consumedGas, isSyncing);
		} catch (error) {
			this.#stopping = true;
			void this.app.terminate("tx-pool worker failed to commit", error as Error);
		} finally {
			clearTimeout(timeout);
		}
	}

	#isRunning(): boolean {
		return !this.#respawning && !this.ipcSubprocess.isStopped();
	}

	async #sendIfRunning<T>(method: string, ...arguments_: unknown[]): Promise<T | undefined> {
		if (this.#isRunning()) {
			try {
				return await this.#send<T>(method, ...arguments_);
			} catch (error) {
				if (this.#isRunning()) {
					throw error;
				}
			}
		}

		this.#respawn();

		return undefined;
	}

	#respawn(): void {
		if (!this.#started || this.#stopping) {
			return;
		}

		this.#started = false;
		this.#respawning = true;
		this.#respawnPromise = this.#doRespawn();
	}

	async #doRespawn(): Promise<void> {
		this.logger.warn("Respawning the transaction pool worker");

		try {
			await this.ipcSubprocess.kill();

			if (this.#stopping) {
				return;
			}

			this.ipcSubprocess = this.createWorkerSubprocess();

			for (const [event, callback] of this.#eventHandlers) {
				this.ipcSubprocess.registerEventHandler(event, callback);
			}

			this.#bootPromise = this.ipcSubprocess.sendRequest("boot", this.#flags);
			await this.#bootPromise;

			if (this.#stopping) {
				return;
			}

			const start = this.ipcSubprocess.sendRequest("start", this.#blockNumber);
			this.#respawning = false;
			void this.#restorePeers();
			await start;
		} catch (error) {
			if (!this.#stopping) {
				this.#stopping = true;
				void this.app.terminate("tx-pool worker failed to respawn", error as Error);
			}

			return;
		}

		this.#started = true;
		this.logger.info("Respawned the transaction pool worker");
	}

	async #restorePeers(): Promise<void> {
		if (!this.app.isBound(Identifiers.P2P.Peer.Repository)) {
			return;
		}

		const peers = this.app.get<Contracts.P2P.PeerRepository>(Identifiers.P2P.Peer.Repository).getPeers();
		await Promise.allSettled(peers.map(async (peer) => this.setPeer(peer.ip)));
	}

	async #send<T>(method: string, ...arguments_: unknown[]): Promise<T> {
		if (!this.#bootPromise) {
			throw new Error("worker request issued before boot()");
		}

		await this.#bootPromise;

		return this.ipcSubprocess.sendRequest<T>(method, ...arguments_);
	}
}
