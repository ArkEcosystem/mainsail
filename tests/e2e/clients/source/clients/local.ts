import { http } from "@mainsail/utils";

import { Client } from "../types.js";

export class LocalClient implements Client {
	#id = 0;

	public constructor(private url: string) {}

	public async getHeight(): Promise<number> {
		return Number.parseInt(await this.#JSONRPCCall<string>("eth_blockNumber", []));
	}

	public async getBlock(): Promise<Record<string, any>> {
		return this.#JSONRPCCall<Record<string, any>>("eth_getBlockByNumber", ["latest", true]);
	}

	async #JSONRPCCall<T>(method: string, parameters: any[]): Promise<T> {
		const response = await http.post(this.url, {
			body: {
				id: this.#id++,
				jsonrpc: "2.0",
				method,
				params: parameters,
			},
			headers: { "Content-Type": "application/json" },
		});

		return this.#parseJSONRPCResult<T>(method, response);
	}

	#parseJSONRPCResult<T>(method: string, response: any): T {
		if (response.statusCode !== 200) {
			const error = `Error on ${method}. Status code is ${response.statusCode}`;
			throw new Error(error);
		} else if (response.data.error) {
			const error = `Error on ${method}. Error code: ${response.data.error.code}, message: ${response.data.error.message}`;
			throw new Error(error);
		}

		return response.data.result;
	}
}
