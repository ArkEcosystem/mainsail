import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { http } from "@mainsail/utils";

@injectable()
export class Client implements Contracts.TransactionPool.Client {
	@inject(Identifiers.Services.Log.Service)
	protected readonly logger!: Contracts.Kernel.Logger;

	public async getTx(): Promise<Contracts.Crypto.Transaction[]> {
		try {
			const response = await this.#call<[]>("get_transactions", {});
			this.logger.info(`Transaction pool returned ${response.length} transactions`);
		} catch (error) {
			this.logger.error(`Communication error with transaction pool: ${error.message}`);
		}

		return [];
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
