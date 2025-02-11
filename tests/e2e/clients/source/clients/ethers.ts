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
}
