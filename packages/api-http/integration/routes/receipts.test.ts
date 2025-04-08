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
				query: `?transactionHash=${receipts[0].transactionHash}`,
				result: [receiptsResult[0]],
			},
			{
				query: "?transactionHash=0000000000000000000000000000000000000000000000000000000000000001",
				result: [],
			},
			{
				query: `?from=${receiptTransactions[0].senderPublicKey}`,
				result: receiptsResult,
			},
			{
				query: `?to=${receipts[1].contractAddress}`,
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

	it("/receipts/{transactionHash}", async () => {
		await apiContext.transactionRepository.save(receiptTransactions);
		await apiContext.receiptsRepository.save(receipts);
		await apiContext.walletRepository.save(receiptWallets);

		const testCases = [
			{
				transactionHash: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
				statusCode: 404,
				result: null,
			},
			{
				transactionHash: receipts[0].transactionHash,
				result: receiptsResult[0],
			},
			{
				transactionHash: receipts[receiptsResult.length - 1].transactionHash,
				result: receiptsResult[receiptsResult.length - 1],
			},
		];

		for (const { transactionHash, statusCode: expectedStatusCode = 200, result } of testCases) {
			try {
				const { statusCode, data } = await request(`/receipts/${transactionHash}`, options);
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
				query: `?from=${receiptTransactions[0].senderPublicKey}`,
				result: [receiptsResult[1]],
			},
			{
				query: `?from=asdfgfg`,
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
