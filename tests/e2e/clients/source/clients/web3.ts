import { Web3, Web3EthInterface } from "web3";

import { Client } from "../types.js";

export class Web3Client implements Client {
	#client: Web3EthInterface;

	public constructor(url: string) {
		this.#client = new Web3(url).eth;
	}

	public async getHeight(): Promise<number> {
		return Number(await this.#client.getBlockNumber());
	}

	public async getBlock(): Promise<Record<string, any>> {
		return this.#client.getBlock("latest");
	}
}
