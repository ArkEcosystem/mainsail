import { describe, Sandbox } from "../../../test-framework/source";
import receipts from "../../test/fixtures/receipts.json";
import receiptsResult from "../../test/fixtures/receipts_result.json";
import receiptTransactions from "../../test/fixtures/receipt_transactions.json";
import receiptWallets from "../../test/fixtures/receipt_wallets.json";
import { ApiContext, prepareSandbox } from "../../test/helpers/prepare-sandbox";
import { request } from "../../test/helpers/request";

describe<{
	sandbox: Sandbox;
}>("Receipts", ({ it, afterAll, assert, afterEach, beforeAll, beforeEach, nock }) => {
	let apiContext: ApiContext;

	const options = {
		fullReceipt: true,
	};

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
				result: receiptsResult,
			},
			{
				query: `?txHash=${receipts[0].id}`,
				result: [receiptsResult[0]],
			},
			{
				query: "?txHash=0000000000000000000000000000000000000000000000000000000000000001",
				result: [],
			},
			{
				query: `?sender=${receiptTransactions[0].senderPublicKey}`,
				result: receiptsResult,
			},
			{
				query: `?recipient=${receipts[1].deployedContractAddress}`,
				result: [receiptsResult[0]],
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

	it("/receipts/{id}", async () => {
		await apiContext.transactionRepository.save(receiptTransactions);
		await apiContext.receiptsRepository.save(receipts);
		await apiContext.walletRepository.save(receiptWallets);

		const testCases = [
			{
				id: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
				statusCode: 404,
				result: null,
			},
			{
				id: receipts[0].id,
				result: receiptsResult[0],
			},
			{
				id: receipts[receiptsResult.length - 1].id,
				result: receiptsResult[receiptsResult.length - 1],
			},
		];

		for (const { id, statusCode: expectedStatusCode = 200, result } of testCases) {
			try {
				const { statusCode, data } = await request(`/receipts/${id}`, options);

				assert.equal(statusCode, expectedStatusCode);
				assert.equal(data, result);
			} catch (ex) {
				assert.equal(expectedStatusCode, 404);
				assert.equal(ex.message, "Response code 404 (Not Found)");
			}
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
				result: [receiptsResult[1]],
			},
			{
				query: `?sender=${receiptTransactions[0].senderPublicKey}`,
				result: [receiptsResult[1]],
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
