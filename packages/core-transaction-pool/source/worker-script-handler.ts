import Interfaces from "@arkecosystem/core-crypto-contracts";
import { Contracts } from "@arkecosystem/core-kernel";
import { Managers, Transactions } from "@arkecosystem/crypto";

export class WorkerScriptHandler implements Contracts.TransactionPool.WorkerScriptHandler {
	public setConfig(networkConfig: any): void {
		Managers.configManager.setConfig(networkConfig);
	}

	public setHeight(height: number): void {
		Managers.configManager.setHeight(height);
	}

	public async getTransactionFromData(
		transactionData: Interfaces.ITransactionData | string,
	): Promise<Contracts.TransactionPool.SerializedTransaction> {
		const tx =
			typeof transactionData === "string"
				? Transactions.TransactionFactory.fromBytes(Buffer.from(transactionData, "hex"))
				: Transactions.TransactionFactory.fromData(transactionData);
		return { id: tx.id, isVerified: tx.isVerified, serialized: tx.serialized.toString("hex") };
	}
}
