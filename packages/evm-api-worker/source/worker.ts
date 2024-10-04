import { inject, injectable, postConstruct } from "@mainsail/container";
import { Contracts, Events, Identifiers } from "@mainsail/contracts";

@injectable()
export class Worker implements Contracts.Evm.Worker {
	@inject(Identifiers.Evm.WorkerSubprocess.Factory)
	private readonly createWorkerSubprocess!: Contracts.Crypto.WorkerSubprocessFactory;

	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly eventDispatcher!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.P2P.Peer.Repository)
	private readonly p2pRepository!: Contracts.P2P.PeerRepository;

	private ipcSubprocess!: Contracts.Evm.WorkerSubprocess;

	#booted = false;

	@postConstruct()
	public initialize(): void {
		this.ipcSubprocess = this.createWorkerSubprocess();

		this.eventDispatcher.listen(Events.PeerEvent.Added, this);
		this.eventDispatcher.listen(Events.PeerEvent.Removed, this);
	}

	public registerEventHandler(event: string, callback: Contracts.Kernel.IPC.EventCallback<any>): void {
		this.ipcSubprocess.registerEventHandler(event, callback);
	}

	public handle(payload: { name: string; data: any }): void {
		void this.setPeerCount(this.p2pRepository.getPeers().length);
	}

	public async boot(flags: Contracts.Evm.WorkerFlags): Promise<void> {
		if (this.#booted) {
			return;
		}
		this.#booted = true;

		await this.ipcSubprocess.sendRequest("boot", flags);
	}

	public async kill(): Promise<number> {
		return this.ipcSubprocess.kill();
	}

	public getQueueSize(): number {
		return this.ipcSubprocess.getQueueSize();
	}

	async onCommit(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		await this.ipcSubprocess.sendRequest("commit", unit.height);
	}

	public async setPeerCount(peerCount: number): Promise<void> {
		await this.ipcSubprocess.sendRequest("setPeerCount", peerCount);
	}
}
