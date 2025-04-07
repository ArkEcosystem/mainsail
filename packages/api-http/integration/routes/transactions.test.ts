import { describe, Sandbox } from "../../../test-framework/source";
import receipts from "../../test/fixtures/receipts.json";
import receiptTransactions from "../../test/fixtures/receipt_transactions.json";
import transactions from "../../test/fixtures/transactions.json";
import transactionSchemas from "../../test/fixtures/transactions_schemas.json";
import transactionTypes from "../../test/fixtures/transactions_types.json";
import wallets from "../../test/fixtures/wallets.json";
import { ApiContext, prepareSandbox } from "../../test/helpers/prepare-sandbox";
import { request } from "../../test/helpers/request";

describe<{
	sandbox: Sandbox;
}>("Transactions", ({ it, afterAll, assert, afterEach, beforeAll, beforeEach, nock }) => {
	let apiContext: ApiContext;

	const options = { transform: false };

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

	it("/transactions", async () => {
		await apiContext.transactionRepository.save(transactions);

		const { statusCode, data } = await request("/transactions", options);
		assert.equal(statusCode, 200);
		assert.equal(
			data.data,
			[...transactions].sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber)),
		);
	});

	it("/transactions?data", async () => {
		await apiContext.transactionRepository.save(transactions);

		const testCases = [
			{
				path: "/transactions?data=0x",
				result: [...transactions]
					.filter((tx) => tx.data === "")
					.sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber)),
			},
			{
				path: "/transactions?data=",
				result: [...transactions]
					.filter((tx) => tx.data === "")
					.sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber)),
			},
			{ path: "/transactions?data=88888888", result: [] },
			{
				path: "/transactions?data=6dd7d8ea",
				result: [...transactions]
					.filter((tx) => tx.data.startsWith("0x6dd7d8ea"))
					.sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber)),
			},
		];

		for (const { path, result } of testCases) {
			const { statusCode, data } = await request(path, options);
			assert.equal(statusCode, 200);
			assert.equal(data.data, result);
		}
	});

	it("/transactions?address", async () => {
		await apiContext.transactionRepository.save(transactions);
		await apiContext.walletRepository.save(wallets);

		const transaction = transactions[transactions.length - 1];
		const testCases = [
			{
				path: `/transactions?from=${transaction.from}`,
				result: [...transactions]
					.filter((tx) => tx.from === transaction.from)
					.sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber)),
			},
			{
				path: `/transactions?senderId=${transaction.from}`,
				result: [...transactions]
					.filter((tx) => tx.from === transaction.from)
					.sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber)),
			},
			{
				path: `/transactions?address=${transaction.to}`,
				result: [...transactions]
					.filter((tx) => tx.to === transaction.to)
					.sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber)),
			},
		];

		for (const { path, result } of testCases) {
			const { statusCode, data } = await request(path, options);
			assert.equal(statusCode, 200);
			assert.equal(data.data, result);
		}
	});

	it("/transactions/{hash}", async () => {
		await apiContext.transactionRepository.save(transactions);

		const hash = transactions.at(-1)?.hash;
		const { statusCode, data } = await request(`/transactions/${hash}`, options);
		assert.equal(statusCode, 200);
		assert.equal(data.data, transactions.at(-1));
	});

	it("/transactions/schemas", async () => {
		await apiContext.transactionTypeRepository.save(transactionTypes);

		const { statusCode, data } = await request(`/transactions/schemas`, options);
		assert.equal(statusCode, 200);
		assert.equal(data.data, transactionSchemas);
	});

	it("/transactions with receipt enriched", async () => {
		await apiContext.transactionRepository.save(receiptTransactions);
		await apiContext.receiptsRepository.save(receipts);

		const { statusCode, data } = await request("/transactions", options);
		assert.equal(statusCode, 200);
		assert.equal(
			data.data,
			[...receiptTransactions].sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber)),
		);
	});
});
