import Interfaces, { BINDINGS, IConfiguration, ITransactionFactory } from "@arkecosystem/core-crypto-contracts";
import { Container, Contracts } from "@arkecosystem/core-kernel";

@Container.injectable()
export class Worker implements Contracts.TransactionPool.Worker {
	@Container.inject(Container.Identifiers.TransactionPoolWorkerIpcSubprocessFactory)
	private readonly createWorkerSubprocess: Contracts.TransactionPool.WorkerIpcSubprocessFactory;

	@Container.inject(BINDINGS.Configuration)
	private readonly configuration: IConfiguration;

	@Container.inject(BINDINGS.Transaction.Factory)
	private readonly transactionFactory: ITransactionFactory;

	private ipcSubprocess!: Contracts.TransactionPool.WorkerIpcSubprocess;
	private lastHeight = 0;

	@Container.postConstruct()
	public initialize(): void {
		this.ipcSubprocess = this.createWorkerSubprocess();
	}

	public getQueueSize(): number {
		return this.ipcSubprocess.getQueueSize();
	}

	public async getTransactionFromData(
		transactionData: Interfaces.ITransactionData | Buffer,
	): Promise<Interfaces.ITransaction> {
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
