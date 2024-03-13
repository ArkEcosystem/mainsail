import { describe, Sandbox } from "../../../test-framework/source";
import { prepareSandbox, ApiContext } from "../../test/helpers/prepare-sandbox";
import { request } from "../../test/helpers/request";

import wallets from "../../test/fixtures/wallets.json";
import transactions from "../../test/fixtures/transactions.json";
import walletTransactions from "../../test/fixtures/wallet_transactions.json";

describe<{
	sandbox: Sandbox;
}>("Wallets", ({ it, afterAll, assert, afterEach, beforeAll, beforeEach, nock }) => {
	let apiContext: ApiContext;

	// TODO:
	let options = { transform: false };

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

	it("/wallets", async () => {
		await apiContext.walletRepository.save(wallets);

		const { statusCode, data } = await request("/wallets", options);
		assert.equal(statusCode, 200);
		assert.equal(data.data, wallets);
	});

	it("/wallets/top", async () => {
		await apiContext.walletRepository.save(wallets);

		const { statusCode, data } = await request("/wallets/top", options);
		assert.equal(statusCode, 200);
		assert.equal(data.data, wallets);
	});

	it("/wallets/{id}", async () => {
		await apiContext.walletRepository.save(wallets);

		const wallet = wallets[0];

		const testCases = [
			{
				id: wallet.address,
				result: wallet,
			},
			{
				id: wallet.publicKey,
				result: wallet,
			},
			{
				id: wallet.attributes.username,
				result: wallet,
			},
		];

		for (const { id, result } of testCases) {
			const { statusCode, data } = await request(`/wallets/${id}`, options);
			assert.equal(statusCode, 200);
			assert.equal(data, result);
		}
	});

	it("/wallets/{id}/transactions", async () => {
		await apiContext.walletRepository.save(wallets);
		await apiContext.transactionRepository.save(transactions);

		const wallet = wallets[0];

		let { statusCode, data } = await request(`/wallets/${wallet.address}/transactions`, options);
		assert.equal(statusCode, 200);
		assert.empty(data.data);

		await apiContext.transactionRepository.save(walletTransactions);

		({ statusCode, data } = await request(`/wallets/${wallet.address}/transactions`, options));
		assert.equal(statusCode, 200);
		assert.equal(data.data, walletTransactions.slice(1));
	});

	it("/wallets/{id}/transactions/sent", async () => {
		await apiContext.walletRepository.save(wallets);
		await apiContext.transactionRepository.save(walletTransactions);

		const wallet = wallets[0];

		const { statusCode, data } = await request(`/wallets/${wallet.address}/transactions/sent`, options);
		assert.equal(statusCode, 200);
		assert.equal(data.data, walletTransactions.slice(1));
	});

	it("/wallets/{id}/transactions/received", async () => {
		await apiContext.walletRepository.save(wallets);
		await apiContext.transactionRepository.save(walletTransactions);

		const recipient = wallets[wallets.length - 2].address;

		const { statusCode, data } = await request(`/wallets/${recipient}/transactions/received`, options);
		assert.equal(statusCode, 200);
		assert.equal(data.data, walletTransactions);
	});
});
