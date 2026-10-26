import { describe } from "@mainsail/test-runner";
import { Application } from "@mainsail/kernel";
import { prepareSandbox, ApiContext } from "../../test/helpers/prepare-sandbox";
import { request } from "../../test/helpers/request";

import blocks from "../../test/fixtures/blocks.json";
import blocksResponse from "../../test/fixtures/blocks.response.json";
import blockTransactions from "../../test/fixtures/block_transactions.json";
import blockTransactionsResponse from "../../test/fixtures/block_transactions.response.json";
import wallets from "../../test/fixtures/wallets.json";

describe<{
	app: Application;
}>("Blocks", ({ it, afterAll, assert, afterEach, beforeAll, beforeEach, nock }) => {
	let apiContext: ApiContext;

	let options = {};

	beforeAll(async (context) => {
		nock.enableNetConnect();
		apiContext = await prepareSandbox(context);
	});

	afterAll((context) => {
		nock.disableNetConnect();
		apiContext.dispose();
	});

	beforeEach(async (context) => {
		await apiContext.reset();
		await apiContext.walletRepository.save(wallets);
	});

	afterEach(async (context) => {
		await apiContext.reset();
	});

	it("/blocks", async () => {
		const { statusCode, data } = await request("/blocks", options);
		assert.equal(statusCode, 200);
	});

	it("/blocks?reward beyond the safe integers", async () => {
		const [first, second] = blocks;
		await apiContext.blockRepository.save([
			{ ...first, reward: "2000000000000000000" },
			{ ...second, reward: "1000000000000000000" },
		]);

		const { statusCode, data } = await request("/blocks?reward.from=1500000000000000000", options);
		assert.equal(statusCode, 200);
		assert.equal(
			data.data.map((block) => block.hash),
			[first.hash],
		);
	});

	it("/blocks/first", async () => {
		await apiContext.blockRepository.save(blocks);

		const { statusCode, data } = await request("/blocks/first", options);
		assert.equal(statusCode, 200);
		assert.equal(data.data, blocksResponse[0]);
	});

	it("/blocks?proposer", async () => {
		await apiContext.blockRepository.save(blocks);

		for (const proposer of [blocks[0].proposer, blocks[0].proposer.toLowerCase()]) {
			const { statusCode, data } = await request(`/blocks?proposer=${proposer}`, options);
			assert.equal(statusCode, 200);
			assert.equal(
				data.data.map(({ hash }) => hash),
				[blocks[0].hash],
			);
		}
	});

	it("/blocks/last", async () => {
		await apiContext.blockRepository.save(blocks);

		const { statusCode, data } = await request("/blocks/last", options);
		assert.equal(statusCode, 200);
		assert.equal(data.data, blocksResponse[blocksResponse.length - 1]);
	});

	it("/blocks/{height}", async () => {
		await apiContext.blockRepository.save(blocks);

		const { statusCode, data } = await request("/blocks/1", options);
		assert.equal(statusCode, 200);
		assert.equal(data.data, blocksResponse[1]);
	});

	it("/blocks ends pages at row 10000", async () => {
		await apiContext.blockRepository.save(blocks);

		for (const path of ["/blocks?limit=100&page=101", "/blocks?limit=100&offset=9901"]) {
			let statusCode;
			try {
				statusCode = (await request(path, options)).statusCode;
			} catch (ex) {
				statusCode = ex.response?.statusCode;
			}

			assert.equal(statusCode, 422);
		}

		const { statusCode, data } = await request("/blocks?limit=100&page=100", options);
		assert.equal(statusCode, 200);
		assert.length(data.data, 0);
	});

	it("/blocks links keep the filters and offsets of a page", async () => {
		await apiContext.blockRepository.save(blocks);

		for (const [path, numbers] of [
			["/blocks?limit=2&number.from=40", [44, 43]],
			["/blocks?limit=2&offset=1", [43, 42]],
		] as const) {
			const { data: page } = await request(path, options);
			const { statusCode, data } = await request(page.meta.next, options);

			assert.equal(statusCode, 200);
			assert.equal(
				data.data.map(({ number }) => number),
				numbers,
			);
		}
	});

	it("/blocks/{id}", async () => {
		await apiContext.blockRepository.save(blocks);

		const id = blocksResponse[blocksResponse.length - 1].hash;
		const { statusCode, data } = await request(`/blocks/${id}`, options);
		assert.equal(statusCode, 200);
		assert.equal(data.data, blocksResponse[blocksResponse.length - 1]);
	});

	it("/blocks/{id}/transactions", async () => {
		await apiContext.blockRepository.save(blocks);
		await apiContext.transactionRepository.save(blockTransactions);

		const { statusCode, data } = await request(`/blocks/1/transactions`, options);
		assert.equal(statusCode, 200);
		assert.equal(data.data, blockTransactionsResponse);
	});

	it("/blocks/{id}/transactions - 404 (Not Found)", async () => {
		await assert.rejects(
			async () => request(`/blocks/xxx/transactions`, options),
			"Request failed with status code 404",
		);
	});
});
