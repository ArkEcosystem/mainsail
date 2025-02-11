import { ethers } from "ethers";

import { Client } from "../types.js";

export class EthersClient implements Client {
	#client: ethers.JsonRpcProvider;

	public constructor(url: string) {
		this.#client = new ethers.JsonRpcProvider(url);
	}

	public async getHeight(): Promise<number> {
		return await this.#client.getBlockNumber();
	}

	public async getBlock(): Promise<Record<string, any>> {
		const block = await this.#client.getBlock("latest");

		if (block) {
			return block;
		}

		throw new Error("Block is missing");
	}
}
