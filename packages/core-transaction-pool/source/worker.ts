import { inject, injectable, postConstruct } from "@arkecosystem/core-container";
import Contracts, { Crypto, Identifiers } from "@arkecosystem/core-contracts";

@injectable()
export class Worker implements Contracts.TransactionPool.Worker {
	@inject(Identifiers.TransactionPoolWorkerIpcSubprocessFactory)
	private readonly createWorkerSubprocess: Contracts.TransactionPool.WorkerIpcSubprocessFactory;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration: Crypto.IConfiguration;

	@inject(Identifiers.Cryptography.Transaction.Factory)
	private readonly transactionFactory: Crypto.ITransactionFactory;

	private ipcSubprocess!: Contracts.TransactionPool.WorkerIpcSubprocess;
	private lastHeight = 0;

	@postConstruct()
	public initialize(): void {
		this.ipcSubprocess = this.createWorkerSubprocess();
	}

	public getQueueSize(): number {
		return this.ipcSubprocess.getQueueSize();
	}

	public async getTransactionFromData(
		transactionData: Crypto.ITransactionData | Buffer,
	): Promise<Crypto.ITransaction> {
		const currentHeight = this.configuration.getHeight()!;
		if (currentHeight !== this.lastHeight) {
			this.lastHeight = currentHeight;
			this.ipcSubprocess.sendAction("setConfig", this.configuration.all());
			this.ipcSubprocess.sendAction("setHeight", currentHeight);
		}

		const { id, serialized, isVerified } = await this.ipcSubprocess.sendRequest(
			"getTransactionFromData",
			transactionData instanceof Buffer ? transactionData.toString("hex") : transactionData,
		);
		const transaction = await this.transactionFactory.fromBytesUnsafe(Buffer.from(serialized, "hex"), id);
		transaction.isVerified = isVerified;

		return transaction;
	}
}
