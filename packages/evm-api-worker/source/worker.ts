import type { Contracts } from "@mainsail/contracts";

import { Events, Identifiers } from "@mainsail/constants";
import { inject, injectable, postConstruct } from "@mainsail/container";

@injectable()
export class Worker implements Contracts.Evm.Worker {
	@inject(Identifiers.Evm.WorkerSubprocess.Factory)
	private readonly createWorkerSubprocess!: Contracts.Kernel.IPC.SubprocessFactory;

	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly eventDispatcher!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.P2P.Peer.Repository)
	private readonly p2pRepository!: Contracts.P2P.PeerRepository;

	private ipcSubprocess!: Contracts.Kernel.IPC.Subprocess;

	#bootPromise?: Promise<void>;
	#disposePromise?: Promise<void>;

	@postConstruct()
	public initialize(): void {
		this.ipcSubprocess = this.createWorkerSubprocess();

		this.eventDispatcher.listen(Events.PeerEvent.Added, this);
		this.eventDispatcher.listen(Events.PeerEvent.Removed, this);
	}

	public registerEventHandler(event: string, callback: Contracts.Kernel.IPC.EventCallback): void {
		this.ipcSubprocess.registerEventHandler(event, callback);
	}

	public async handle(payload: { name: string; data: unknown }): Promise<void> {
		await this.setPeerCount(this.p2pRepository.getPeers().length);
	}

	public async boot(flags: Contracts.Evm.WorkerFlags): Promise<void> {
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

	public async start(blockNumber: number): Promise<void> {
		await this.ipcSubprocess.sendRequest("start", blockNumber);
	}

	async onCommit(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		await this.ipcSubprocess.sendRequest("commit", unit.blockNumber);
	}

	public async setPeerCount(peerCount: number): Promise<void> {
		await this.ipcSubprocess.sendRequest("setPeerCount", peerCount);
	}
}
