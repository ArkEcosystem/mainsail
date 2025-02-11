import { describe } from "@mainsail/test-framework";

import { EthersClient, LocalClient, ViemClient, Web3Client } from "./clients/index.js";
import { Client } from "./types";

const URL = "http://127.0.0.1:4008/api";

describe<{
	localClient: Client;
	clients: Client[];
}>("BlockHeight", ({ beforeEach, it, assert, nock }) => {
	beforeEach((context) => {
		nock.enableNetConnect();
		context.localClient = new LocalClient(URL);

		context.clients = [new Web3Client(URL), new EthersClient(URL), new ViemClient(URL)];
	});

	it("should return correct block height", async ({ localClient, clients }) => {
		const height = await localClient.getHeight();
		assert.number(height);

		for (const client of clients) {
			const h = await client.getHeight();
			assert.equal(height, h);
		}
	});
});
