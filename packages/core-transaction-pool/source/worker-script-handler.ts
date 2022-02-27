import Interfaces, { BINDINGS, IConfiguration, ITransactionFactory } from "@arkecosystem/core-crypto-contracts";
import { Container, Contracts } from "@arkecosystem/core-kernel";

@Container.injectable()
export class WorkerScriptHandler implements Contracts.TransactionPool.WorkerScriptHandler {
	@Container.inject(BINDINGS.Configuration)
	private readonly configuration: IConfiguration;

	@Container.inject(BINDINGS.Transaction.Factory)
	private readonly transactionFactory: ITransactionFactory;

	public setConfig(networkConfig: any): void {
		this.configuration.setConfig(networkConfig);
	}

	public setHeight(height: number): void {
		this.configuration.setHeight(height);
	}

	public async getTransactionFromData(
		transactionData: Interfaces.ITransactionData | string,
	): Promise<Contracts.TransactionPool.SerializedTransaction> {
		const tx =
			typeof transactionData === "string"
				? await this.transactionFactory.fromBytes(Buffer.from(transactionData, "hex"))
				: await this.transactionFactory.fromData(transactionData);
		return { id: tx.id, isVerified: tx.isVerified, serialized: tx.serialized.toString("hex") };
	}
}
