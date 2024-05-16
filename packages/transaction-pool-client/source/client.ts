import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";
import { http } from "@mainsail/utils";

@injectable()
export class Client implements Contracts.TransactionPool.Client {
	public async getTx(): Promise<Contracts.Crypto.Transaction[]> {
		try {
			const response = await this.#call("transactionPool.getTransactions", {});
			console.log(response);
		} catch (error) {
			console.log(error);
		}

		return [];
	}

	// eslint-disable-next-line unicorn/no-null
	async #call<T>(method: string, parameters: any, id: null | number = null): Promise<T> {
		const response = await http.post("http://localhost:3000", {
			body: {
				id,
				jsonrpc: "2.0",
				method,
				params: parameters,
			},
		});

		if (response.statusCode === 200) {
			// TODO: Validate response
			return response.data;
		}

		throw new Error(`Failed to call method: ${method}`);
	}
}
