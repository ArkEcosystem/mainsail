import { describe, Sandbox } from "../../../test-framework/source";
import receipts from "../../test/fixtures/receipts.json";
import receiptTransactions from "../../test/fixtures/receipt_transactions.json";
import transactions from "../../test/fixtures/transactions.json";
import transactionSchemas from "../../test/fixtures/transactions_schemas.json";
import transactionTypes from "../../test/fixtures/transactions_types.json";
import { ApiContext, prepareSandbox } from "../../test/helpers/prepare-sandbox";
import { request } from "../../test/helpers/request";

describe<{
	sandbox: Sandbox;
}>("Transactions", ({ it, afterAll, assert, afterEach, beforeAll, beforeEach, nock }) => {
	let apiContext: ApiContext;

	// TODO:
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
			[...transactions].sort((a, b) => Number(b.blockHeight) - Number(a.blockHeight)),
		);
	});

	it("/transactions?data", async () => {
		await apiContext.transactionRepository.save(transactions);

		const testCases = [
			{
				path: "/transactions?data=0x",
				result: [...transactions]
					.filter((tx) => tx.data === "")
					.sort((a, b) => Number(b.blockHeight) - Number(a.blockHeight)),
			},
			{ path: "/transactions?data=88888888", result: [] },
			{
				path: "/transactions?data=6dd7d8ea",
				result: [...transactions]
					.filter((tx) => tx.data.startsWith("0x6dd7d8ea"))
					.sort((a, b) => Number(b.blockHeight) - Number(a.blockHeight)),
			},
		];

		for (const { path, result } of testCases) {
			const { statusCode, data } = await request(path, options);
			assert.equal(statusCode, 200);
			assert.equal(data.data, result);
		}
	});

	it("/transactions/{id}", async () => {
		await apiContext.transactionRepository.save(transactions);

		const id = transactions.at(-1).id;
		const { statusCode, data } = await request(`/transactions/${id}`, options);
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
			[...receiptTransactions].sort((a, b) => Number(b.blockHeight) - Number(a.blockHeight)),
		);
	});
});
