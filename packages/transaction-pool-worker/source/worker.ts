import { inject, injectable, postConstruct } from "@mainsail/container";
import { Contracts, Events, Identifiers } from "@mainsail/contracts";

@injectable()
export class Worker implements Contracts.TransactionPool.Worker {
	@inject(Identifiers.TransactionPool.WorkerSubprocess.Factory)
	private readonly createWorkerSubprocess!: Contracts.Crypto.WorkerSubprocessFactory;

	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly eventDispatcher!: Contracts.Kernel.EventDispatcher;

	private ipcSubprocess!: Contracts.TransactionPool.WorkerSubprocess;

	#booted = false;
	#failedTransactions: Contracts.Crypto.Transaction[] = [];

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

	public setFailedTransactions(transactions: Contracts.Crypto.Transaction[]): void {
		this.#failedTransactions = [...this.#failedTransactions, ...transactions];
	}

	async onCommit(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		const receipts = unit.getProcessorResult().receipts;

		await this.ipcSubprocess.sendRequest("commit", {
			failedTransactions: this.#failedTransactions.map((transaction) => transaction.id),
			height: unit.height,
			transactions: unit.getBlock().transactions.map((transaction) => ({
				gasUsed:  Number(receipts.get(transaction.id)!.gasUsed),
				transaction: transaction.serialized.toString("hex"),
			})),
		});
	}

	public async start(): Promise<void> {
		await this.ipcSubprocess.sendRequest("start");
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
