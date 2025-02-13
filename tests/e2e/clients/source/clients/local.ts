import { http } from "@mainsail/utils";

import { Client } from "../types.js";

export class LocalClient implements Client {
	#id = 0;

	public readonly name = "local";

	public constructor(private url: string) {}

	public async getChainId(): Promise<number> {
		return Number.parseInt(await this.#JSONRPCCall<string>("eth_chainId", []));
	}

	public async getHeight(): Promise<number> {
		return Number.parseInt(await this.#JSONRPCCall<string>("eth_blockNumber", []));
	}

	public async getBlock(tagOrNumber: string | number): Promise<Record<string, any>> {
		return this.#JSONRPCCall<Record<string, any>>("eth_getBlockByNumber", [
			typeof tagOrNumber === "string" ? tagOrNumber : `0x${tagOrNumber.toString(16)}`,
			true,
		]);
	}

	public async getTransaction(hash: string): Promise<Record<string, any>> {
		return this.#JSONRPCCall<Record<string, any>>("eth_getTransactionByHash", [hash]);
	}

	public async getTransactionByBlockNumberAndIndex(blockNumber: number, index: number): Promise<Record<string, any>> {
		return this.#JSONRPCCall<Record<string, any>>("eth_getTransactionByBlockNumberAndIndex", [
			`0x${blockNumber.toString(16)}`,
			`0x${index.toString(16)}`,
		]);
	}

	public async getReceipt(hash: string): Promise<Record<string, any>> {
		return this.#JSONRPCCall<Record<string, any>>("eth_getTransactionReceipt", [hash]);
	}

	public async getBalance(address: string): Promise<number> {
		return Number.parseInt(await this.#JSONRPCCall<string>("eth_getBalance", [address, `latest`]));
	}

	public async getNonce(address: string): Promise<number> {
		return Number.parseInt(await this.#JSONRPCCall<string>("eth_getTransactionCount", [address, `latest`]));
	}

	public async getCode(address: string): Promise<string> {
		return this.#JSONRPCCall<string>("eth_getCode", [address, `latest`]);
	}

	public async getStorageAt(address: string, position: string): Promise<string> {
		return this.#JSONRPCCall<string>("eth_getStorageAt", [address, position, "latest"]);
	}

	public async call(address: string, data: string): Promise<string> {
		return this.#JSONRPCCall<string>("eth_call", [{ to: address, data }, "latest"]);
	}

	public async sendTx(serialized: string): Promise<string> {
		return this.#JSONRPCCall<string>("eth_sendRawTransaction", [serialized]);
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
