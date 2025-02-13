import { ethers } from "ethers";

import { Client } from "../types.js";

export class EthersClient implements Client {
	#client: ethers.JsonRpcProvider;

	public readonly name = "ethers";

	public constructor(url: string) {
		this.#client = new ethers.JsonRpcProvider(url);
	}

	public async getChainId(): Promise<number> {
		return Number((await this.#client.getNetwork()).chainId);
	}

	public async getHeight(): Promise<number> {
		return await this.#client.getBlockNumber();
	}

	public async getBlock(tagOrNumber: string | number): Promise<Record<string, any>> {
		const block = await this.#client.getBlock(tagOrNumber);

		if (block) {
			return block;
		}

		throw new Error("Block is missing");
	}

	public async getTransaction(hash: string): Promise<Record<string, any>> {
		const transaction = await this.#client.getTransaction(hash);

		if (transaction) {
			return transaction;
		}

		throw new Error("Transaction is missing");
	}

	public async getTransactionByBlockNumberAndIndex(blockNumber: number, index: number): Promise<Record<string, any>> {
		throw new Error("Not implemented");
	}

	public async getReceipt(hash: string): Promise<Record<string, any>> {
		const receipt = await this.#client.getTransactionReceipt(hash);

		if (receipt) {
			return receipt;
		}

		throw new Error("Receipt is missing");
	}

	public async getBalance(address: string): Promise<number> {
		return Number(await this.#client.getBalance(address));
	}

	public async getNonce(address: string): Promise<number> {
		return Number(await this.#client.getTransactionCount(address));
	}

	public async getCode(address: string): Promise<string> {
		return this.#client.getCode(address);
	}

	public async getStorageAt(address: string, position: string): Promise<string> {
		return this.#client.getStorage(address, position);
	}

	public async call(address: string, data: string): Promise<string> {
		return this.#client.call({
			data,
			to: address,
		});
	}

	public async sendTx(serialized: string): Promise<string> {
		return (await this.#client.broadcastTransaction(serialized)).hash;
	}
}
