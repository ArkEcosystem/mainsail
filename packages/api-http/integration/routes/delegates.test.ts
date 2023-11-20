import { describe, Sandbox } from "../../../test-framework";
import { prepareSandbox, ApiContext } from "../../test/helpers/prepare-sandbox";
import { request } from "../../test/helpers/request";

import delegates from "../../test/fixtures/delegates.json";
import wallets from "../../test/fixtures/wallets.json";
import blocks from "../../test/fixtures/blocks.json";
import delegateBlocks from "../../test/fixtures/delegate_blocks.json";

describe<{
	sandbox: Sandbox;
}>("Delegates", ({ it, afterAll, assert, afterEach, beforeAll, beforeEach, nock }) => {
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
	});

	afterEach(async (context) => {
		await apiContext.reset();
	});

	it("/delegates", async () => {
		await apiContext.walletRepository.save(delegates);

		const { statusCode, data } = await request("/delegates", options);
		assert.equal(statusCode, 200);
		assert.equal(data.data, delegates);
	});

	it("/delegates/{id}", async () => {
		await apiContext.walletRepository.save(delegates);

		const delegate = delegates[0];

		const testCases = [
			{
				id: delegate.address,
				result: delegate,
			},
			{
				id: delegate.publicKey,
				result: delegate,
			},
			{
				id: delegate.attributes.username,
				result: delegate,
			},
		];

		for (const { id, result } of testCases) {
			const { statusCode, data } = await request(`/delegates/${id}`, options);
			assert.equal(statusCode, 200);
			assert.equal(data, result);
		}
	});

	it("/delegates/{id}/voters", async () => {
		await apiContext.walletRepository.save(delegates);
		await apiContext.walletRepository.save(wallets);

		const wallet = wallets[wallets.length - 1];

		let { statusCode, data } = await request(`/delegates/${wallet.address}/voters`, options);
		assert.equal(statusCode, 200);
		assert.empty(data.data);

		const delegate = delegates[0];
		({ statusCode, data } = await request(`/delegates/${delegate.address}/voters`, options));
		assert.equal(statusCode, 200);
		assert.equal(data.data, [delegate]);
	});

	it("/delegates/{id}/blocks", async () => {
		await apiContext.walletRepository.save(delegates);
		await apiContext.blockRepository.save(blocks);
		await apiContext.blockRepository.save(delegateBlocks);

		const delegate = delegates[0];

		const { statusCode, data } = await request(`/delegates/${delegate.address}/blocks`, { transform: false });
		assert.equal(statusCode, 200);
		assert.equal(data.data, delegateBlocks);
	});
});
