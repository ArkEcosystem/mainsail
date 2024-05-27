import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { http } from "@mainsail/utils";

import { jsonRpcResponse, ReplySchemas } from "./reply-schemas.js";

@injectable()
export class Client implements Contracts.TransactionPool.Client {
	@inject(Identifiers.Cryptography.Validator)
	private readonly validator!: Contracts.Crypto.Validator;

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
			const request: Contracts.TransactionPool.Actions.GetTransactionsRequest = {};
			const response = await this.#call<Contracts.TransactionPool.Actions.GetTransactionsResponse>(
				action,
				request,
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
			const request: Contracts.TransactionPool.Actions.CommitRequest = {
				block: unit.getBlock().serialized,
				failedTransactions: this.#failedTransactions.map((transaction) => transaction.id),
				store: unit.store.changesToJson(),
			};
			await this.#call<Contracts.TransactionPool.Actions.CommitResponse>(action, request);

			this.#failedTransactions = [];
		} catch (error) {
			this.logger.error(`Transaction pool - ${action}: ${error.message}`);
		}
	}

	public async listSnapshots(): Promise<number[]> {
		const action = "list_snapshots";
		try {
			const request: Contracts.TransactionPool.Actions.ListSnapshotsRequest = {};
			return await this.#call<Contracts.TransactionPool.Actions.ListSnapshotsResponse>(action, request);
		} catch (error) {
			this.logger.error(`Transaction pool - ${action}: ${error.message}`);
		}

		return [];
	}

	public async importSnapshot(height: number): Promise<void> {
		const action = "import_snapshot";
		try {
			const request: Contracts.TransactionPool.Actions.ImportSnapshotsRequest = { height };
			await this.#call<Contracts.TransactionPool.Actions.ImportSnapshotsResponse>(action, request);
		} catch (error) {
			this.logger.error(`Transaction pool - ${action}: ${error.message}`);
		}
	}

	public async getStatus(): Promise<{ height: number; version: string }> {
		const action = "get_status";
		try {
			const request: Contracts.TransactionPool.Actions.GetStatusRequest = {};
			return await this.#call<Contracts.TransactionPool.Actions.GetStatusResponse>(action, request);
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
			this.#validateResponse(response.data);
			const result = response.data.result;

			if (result) {
				this.#validateResult(method, result);
				return result;
			}

			throw new Error(
				`RPC Call to ${method} failed with  RPC error ${response.data.error.code} - ${response.data.error.message}`,
			);
		}

		throw new Error(`RPC Call to ${method} failed with ${response.statusCode}`);
	}

	#validateResponse(response: any): void {
		const { error } = this.validator.validate(jsonRpcResponse, response);
		if (error) {
			throw new Error(`Cannot validate JSON_RPC response`);
		}
	}

	#validateResult(endpoint: string, result: any): void {
		const schema = ReplySchemas[endpoint];
		if (schema === undefined) {
			throw new Error(`Cannot find schema "${endpoint}"`);
		}

		const { error } = this.validator.validate(schema, result);
		if (error) {
			throw new Error(`Cannot validate JSON_RPC result.`);
		}
	}
}
