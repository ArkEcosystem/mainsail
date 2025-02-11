import { describe } from "@mainsail/test-framework";
import { genesisBlock } from "../config/core/crypto.json";

import { EthersClient, LocalClient, ViemClient } from "./clients/index.js";
import { Client } from "./types";
import { compareBlocks, compareTransactions } from "./utils/index.js";

const URL = "http://127.0.0.1:4008/api";

describe<{
	localClient: LocalClient;
	clients: Client[];
}>("General", ({ beforeEach, it, assert, nock }) => {
	beforeEach((context) => {
		nock.enableNetConnect();
		context.localClient = new LocalClient(URL);
		context.clients = [new EthersClient(URL), new ViemClient(URL)];
		// context.clients = [new EthersClient(URL)];
	});

	it("Block - should return current block height", async ({ localClient, clients }) => {
		const height = await localClient.getHeight();
		assert.number(height);

		for (const client of clients) {
			assert.equal(height, await client.getHeight());
		}
	});

	it("Block - should get latest block", async ({ localClient, clients }) => {
		const lastBlock = await localClient.getBlock("latest");

		for (const client of clients) {
			const b = await client.getBlock("latest");
			compareBlocks(assert, lastBlock, b);
		}
	});

	it("Block - should get genesis block", async ({ localClient, clients }) => {
		const lastBlock = await localClient.getBlock(0);

		for (const client of clients) {
			const b = await client.getBlock(0);
			compareBlocks(assert, lastBlock, b);
		}
	});

	it.only("Transaction - should get genesis transaction by hash", async ({ localClient, clients }) => {
		const hash = `0x${genesisBlock.block.transactions[0].id}`;
		const tx = await localClient.getTransaction(hash);

		for (const client of clients) {
			const t = await client.getTransaction(hash);
			compareTransactions(assert, tx, t);
		}
	});
});
