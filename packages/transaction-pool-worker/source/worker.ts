import { inject, injectable, postConstruct } from "@mainsail/container";
import { Contracts, Events, Identifiers } from "@mainsail/contracts";

@injectable()
export class Worker implements Contracts.TransactionPool.Worker {
	@inject(Identifiers.TransactionPool.WorkerSubprocess.Factory)
	private readonly createWorkerSubprocess!: Contracts.Crypto.WorkerSubprocessFactory;

	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly eventDispatcher!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.Cryptography.Identity.Address.Factory)
	private readonly addressFactory!: Contracts.Crypto.AddressFactory;

	private ipcSubprocess!: Contracts.TransactionPool.WorkerSubprocess;

	#booted = false;

	@postConstruct()
	public initialize(): void {
		this.ipcSubprocess = this.createWorkerSubprocess();

		this.eventDispatcher.listen(Events.WebhookEvent.Created, this);
		this.eventDispatcher.listen(Events.WebhookEvent.Updated, this);
		this.eventDispatcher.listen(Events.WebhookEvent.Removed, this);
	}

	public handle(payload: { name: string; data: any }): void {
		void this.reloadWebhooks();
	}

	public registerEventHandler(event: string, callback: Contracts.Kernel.IPC.EventCallback<any>): void {
		this.ipcSubprocess.registerEventHandler(event, callback);
	}

	public async boot(flags: Contracts.TransactionPool.WorkerFlags): Promise<void> {
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
		const sendersAddresses: Set<string> = new Set();

		for (const transaction of unit.getBlock().transactions) {
			sendersAddresses.add(await this.addressFactory.fromPublicKey(transaction.data.senderPublicKey));
		}

		await this.ipcSubprocess.sendRequest("commit", unit.height, [...sendersAddresses.keys()]);
	}

	public async start(height: number): Promise<void> {
		await this.ipcSubprocess.sendRequest("start", height);
	}

	public async getTransactionBytes(): Promise<Buffer[]> {
		const response: string[] = await this.ipcSubprocess.sendRequest("getTransactions");
		return response.map((transaction: string) => Buffer.from(transaction, "hex"));
	}

	public async setPeer(ip: string): Promise<void> {
		await this.ipcSubprocess.sendRequest("setPeer", ip);
	}

	public async forgetPeer(ip: string): Promise<void> {
		await this.ipcSubprocess.sendRequest("forgetPeer", ip);
	}

	public async reloadWebhooks(): Promise<void> {
		await this.ipcSubprocess.sendRequest("reloadWebhooks");
	}
}
