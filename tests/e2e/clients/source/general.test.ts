import { describe } from "@mainsail/test-framework";

import { EthersClient, LocalClient, ViemClient, Web3Client } from "./clients/index.js";
import { Client } from "./types";

const URL = "http://127.0.0.1:4008/api";

describe<{
	localClient: LocalClient;
	clients: Client[];
}>("General", ({ beforeEach, it, assert, nock }) => {
	beforeEach((context) => {
		nock.enableNetConnect();
		context.localClient = new LocalClient(URL);
		context.clients = [new Web3Client(URL), new EthersClient(URL), new ViemClient(URL)];
	});

	it("#eth_blockNumber - should return current block height", async ({ localClient, clients }) => {
		const height = await localClient.getHeight();
		assert.number(height);

		for (const client of clients) {
			assert.equal(height, await client.getHeight());
		}
	});

	it.only("should get latest block", async ({ localClient, clients }) => {
		const lastBlock = await localClient.getBlock();

		const numericFields = [
			"number",
			"nonce",
			"difficulty",
			// "totalDifficulty",
			"baseFeePerGas",
			// "size",
			"gasLimit",
			"gasUsed",
			"timestamp",
		];

		const hexFields = [
			"hash",
			"parentHash",
			// "sha3Uncles",
			// "transactionsRoot",
			"stateRoot",
			"receiptsRoot",
			"miner",
			"extraData",
		];

		const compareBlocks = (a: Record<string, any>, b: Record<string, any>) => {
			for (const field of numericFields) {
				assert.equal(Number(a[field]), Number(b[field]));
			}

			for (const field of hexFields) {
				assert.equal(a[field].toLowerCase(), b[field].toLowerCase());
			}
		};

		for (const client of clients) {
			const b = await client.getBlock();
			compareBlocks(lastBlock, b);
		}
	});
});
