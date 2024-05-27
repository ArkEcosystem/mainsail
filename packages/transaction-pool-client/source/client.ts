import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { http } from "@mainsail/utils";

@injectable()
export class Client implements Contracts.TransactionPool.Client {
	@inject(Identifiers.Services.Log.Service)
	protected readonly logger!: Contracts.Kernel.Logger;

	#failedTransactions: Contracts.Crypto.Transaction[] = [];

	async onCommit(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		await this.commit(unit);
	}

	public setFailedTransactions(transactions: Contracts.Crypto.Transaction[]): void {
		this.#failedTransactions = [...this.#failedTransactions, ...transactions];
	}

	public async getTransactionBytes(): Promise<Buffer[]> {
		const action = "get_transactions";
		try {
			const response = await this.#call<Contracts.TransactionPool.Actions.GetTransactionsResponse>(
				action,
				{} as Contracts.TransactionPool.Actions.GetTransactionsRequest,
			);
			this.logger.info(`Transaction pool returned ${response.length} transactions`);

			return response.map((transaction: string) => Buffer.from(transaction, "hex"));
		} catch (error) {
			this.logger.error(`Transaction pool - ${action}: ${error.message}`);
		}

		return [];
	}

	public async commit(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		const action = "commit";
		try {
			await this.#call<Contracts.TransactionPool.Actions.CommitResponse>(action, {
				block: unit.getBlock().serialized,
				failedTransactions: this.#failedTransactions.map((transaction) => transaction.id),
				store: unit.store.changesToJson(),
			} as Contracts.TransactionPool.Actions.CommitRequest);

			this.#failedTransactions = [];
		} catch (error) {
			this.logger.error(`Transaction pool - ${action}: ${error.message}`);
		}
	}

	public async listSnapshots(): Promise<number[]> {
		const action = "list_snapshots";
		try {
			return await this.#call<number[]>(action, {});
		} catch (error) {
			this.logger.error(`Transaction pool - ${action}: ${error.message}`);
		}

		return [];
	}

	public async importSnapshot(height: number): Promise<void> {
		const action = "import_snapshot";
		try {
			await this.#call(action, { height });
		} catch (error) {
			this.logger.error(`Transaction pool - ${action}: ${error.message}`);
		}
	}

	public async getStatus(): Promise<{ height: number; version: string }> {
		const action = "get_status";
		try {
			return await this.#call<Contracts.TransactionPool.Actions.GetStatusResponse>(
				action,
				{} as Contracts.TransactionPool.Actions.GetStatusRequest,
			);
		} catch (error) {
			this.logger.error(`Transaction pool - ${action}: ${error.message}`);
			throw error;
		}
	}

	// eslint-disable-next-line unicorn/no-null
	async #call<T>(method: string, parameters: any, id: null | number = null): Promise<T> {
		const response = await http.post("http://127.0.0.1:4009/api", {
			body: { id, jsonrpc: "2.0", method, params: parameters },
		});

		if (response.statusCode === 200) {
			if (response.data.result) {
				return response.data.result;
			}

			throw new Error(
				`RPC Call to ${method} failed with  RPC error ${response.data.error.code} - ${response.data.error.message}`,
			);
		}

		throw new Error(`RPC Call to ${method} failed with ${response.statusCode}`);
	}
}
