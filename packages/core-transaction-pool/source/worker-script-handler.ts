import Contracts, { Crypto, Identifiers } from "@arkecosystem/core-contracts";
import { inject, injectable } from "@arkecosystem/core-container";

@injectable()
export class WorkerScriptHandler implements Contracts.TransactionPool.WorkerScriptHandler {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration: Crypto.IConfiguration;

	@inject(Identifiers.Cryptography.Transaction.Factory)
	private readonly transactionFactory: Crypto.ITransactionFactory;

	public setConfig(networkConfig: any): void {
		this.configuration.setConfig(networkConfig);
	}

	public setHeight(height: number): void {
		this.configuration.setHeight(height);
	}

	public async getTransactionFromData(
		transactionData: Crypto.ITransactionData | string,
	): Promise<Contracts.TransactionPool.SerializedTransaction> {
		const tx =
			typeof transactionData === "string"
				? await this.transactionFactory.fromBytes(Buffer.from(transactionData, "hex"))
				: await this.transactionFactory.fromData(transactionData);
		return { id: tx.id, isVerified: tx.isVerified, serialized: tx.serialized.toString("hex") };
	}
}
