import { createPublicClient, http, PublicClient } from "viem";

import { Client } from "../types.js";

export class ViemClient implements Client {
	#client: PublicClient;

	public readonly name = "viem";

	public constructor(url: string) {
		this.#client = createPublicClient({
			transport: http(url),
		});
	}

	public async getHeight(): Promise<number> {
		return Number(await this.#client.getBlockNumber());
	}

	public async getBlock(tagOrNumber: string | number): Promise<Record<string, any>> {
		return this.#client.getBlock(
			typeof tagOrNumber === "string"
				? {
						blockTag: tagOrNumber,
					}
				: {
						blockNumber: tagOrNumber,
					},
		);
	}

	public async getTransaction(hash: string): Promise<Record<string, any>> {
		return this.#client.getTransaction({
			hash,
		});
	}

	public async getTransactionByBlockNumberAndIndex(blockNumber: number, index: number): Promise<Record<string, any>> {
		return this.#client.getTransaction({
			blockNumber,
			index,
		});
	}

	public async getBalance(address: string): Promise<number> {
		return Number(
			await this.#client.getBalance({
				address,
				blockTag: "latest",
			}),
		);
	}

	public async getNonce(address: string): Promise<number> {
		return Number(
			await this.#client.getTransactionCount({
				address,
				blockTag: "latest",
			}),
		);
	}
}
