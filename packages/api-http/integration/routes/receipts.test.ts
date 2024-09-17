import { describe, Sandbox } from "../../../test-framework/source";
import receipts from "../../test/fixtures/receipts.json";
import receiptTransactions from "../../test/fixtures/receipt_transactions.json";
import receiptWallets from "../../test/fixtures/receipt_wallets.json";
import { ApiContext, prepareSandbox } from "../../test/helpers/prepare-sandbox";
import { request } from "../../test/helpers/request";

describe<{
	sandbox: Sandbox;
}>("Receipts", ({ it, afterAll, assert, afterEach, beforeAll, beforeEach, nock }) => {
	let apiContext: ApiContext;

	const options = {};

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

	it("/receipts", async () => {
		let { statusCode, data } = await request("/receipts", options);
		assert.equal(statusCode, 200);
		assert.empty(data.data);

		await apiContext.transactionRepository.save(receiptTransactions);
		await apiContext.receiptsRepository.save(receipts);
		await apiContext.walletRepository.save(receiptWallets);

		const testCases = [
			{
				query: "",
				result: receipts,
			},
			{
				query: `?txHash=${receipts[0].id}`,
				result: [receipts[0]],
			},
			{
				query: "?txHash=0000000000000000000000000000000000000000000000000000000000000001",
				result: [],
			},
			{
				query: `?sender=${receiptTransactions[0].senderPublicKey}`,
				result: receipts,
			},
			{
				query: `?recipient=${receipts[1].deployedContractAddress}`,
				result: [receipts[0]],
			},
		];

		for (const { query, result } of testCases) {
			const {
				statusCode,
				data: { data },
			} = await request(`/receipts${query}`, options);

			assert.equal(statusCode, 200);
			assert.equal(data, result);
		}
	});

	it("/receipts/contracts", async () => {
		let { statusCode, data } = await request("/receipts", options);
		assert.equal(statusCode, 200);
		assert.empty(data.data);

		await apiContext.transactionRepository.save(receiptTransactions);
		await apiContext.receiptsRepository.save(receipts);
		await apiContext.walletRepository.save(receiptWallets);

		const testCases = [
			{
				query: "",
				result: [receipts[1]],
			},
			{
				query: `?sender=${receiptTransactions[0].senderPublicKey}`,
				result: [receipts[1]],
			},
			{
				query: `?sender=asdfgfg`,
				result: [],
			},
		];

		for (const { query, result } of testCases) {
			const {
				statusCode,
				data: { data },
			} = await request(`/receipts/contracts${query}`, options);

			assert.equal(statusCode, 200);
			assert.equal(data, result);
		}
	});
});
