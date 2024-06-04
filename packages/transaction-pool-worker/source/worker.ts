import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

@injectable()
export class Worker implements Contracts.TransactionPool.Worker {
	@inject(Identifiers.TransactionPool.WorkerSubprocess.Factory)
	private readonly createWorkerSubprocess!: Contracts.Crypto.WorkerSubprocessFactory;

	private ipcSubprocess!: Contracts.TransactionPool.WorkerSubprocess;

	#booted = false;
	#booting = false;
	#failedTransactions: Contracts.Crypto.Transaction[] = [];

	public async boot(flags: Contracts.TransactionPool.WorkerFlags): Promise<void> {
		this.ipcSubprocess = this.createWorkerSubprocess();

		while (this.#booting) {
			await Utils.sleep(50);
		}

		if (this.#booted) {
			return;
		}

		this.#booting = true;

		await this.ipcSubprocess.sendRequest("boot", flags);

		this.#booting = false;
		this.#booted = true;
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
		await this.ipcSubprocess.sendRequest("commit", {
			block: unit.getBlock().serialized,
			failedTransactions: this.#failedTransactions.map((transaction) => transaction.id),
			store: unit.store.changesToJson(),
		});
	}

	public async importSnapshot(height: number): Promise<void> {
		await this.ipcSubprocess.sendRequest("importSnapshot", height);
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
}
