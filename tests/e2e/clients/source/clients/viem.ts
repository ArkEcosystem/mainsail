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

	public async getChainId(): Promise<number> {
		return this.#client.getChainId();
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

	public async getReceipt(hash: string): Promise<Record<string, any>> {
		return this.#client.getTransactionReceipt({
			hash,
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

	public async getCode(address: string): Promise<string> {
		return this.#client.getCode({
			address,
			blockTag: "latest",
		});
	}

	public async getStorageAt(address: string, position: string): Promise<string> {
		return this.#client.getStorageAt({
			address,
			blockTag: "latest",
			slot: position,
		});
	}

	public async call(address: string, data: string): Promise<string> {
		return (
			await this.#client.call({
				to: address,
				blockTag: "latest",
				data,
			})
		).data;
	}

	public async sendTx(serialized: string): Promise<string> {
		return this.#client.sendRawTransaction({
			serializedTransaction: serialized,
		});
	}
}
