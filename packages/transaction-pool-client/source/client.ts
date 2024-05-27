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
		try {
			const response = await this.#call<[]>("get_transactions", {});
			this.logger.info(`Transaction pool returned ${response.length} transactions`);

			return response.map((transaction: string) => Buffer.from(transaction, "hex"));
		} catch (error) {
			this.logger.error(`Communication error with transaction pool: ${error.message}`);
		}

		return [];
	}

	public async commit(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		try {
			await this.#call("commit", {
				block: unit.getBlock().serialized,
				failedTransactions: this.#failedTransactions.map((transaction) => transaction.id),
				store: unit.store.changesToJson(),
			});

			this.#failedTransactions = [];
		} catch (error) {
			this.logger.error(`Transaction pool: ${error.message}`);
		}
	}

	public async listSnapshots(): Promise<number[]> {
		try {
			return await this.#call<number[]>("list_snapshots", {});
		} catch (error) {
			this.logger.error(`Transaction pool: ${error.message}`);
		}

		return [];
	}

	public async importSnapshot(height: number): Promise<void> {
		try {
			await this.#call("import_snapshot", { height });
		} catch (error) {
			this.logger.error(`Transaction pool: ${error.message}`);
		}
	}

	public async getStatus(): Promise<{ height: number; version: string }> {
		try {
			return await this.#call<{ height: number; version: string }>("get_status", {});
		} catch (error) {
			this.logger.error(`Transaction pool: ${error.message}`);
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
