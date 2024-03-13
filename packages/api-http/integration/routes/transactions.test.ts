import { describe, Sandbox } from "../../../test-framework/source";
import { prepareSandbox, ApiContext } from "../../test/helpers/prepare-sandbox";
import { request } from "../../test/helpers/request";

import transactions from "../../test/fixtures/transactions.json";
import unconfirmedTransactions from "../../test/fixtures/unconfirmed_transactions.json";
import transactionTypes from "../../test/fixtures/transactions_types.json";
import transactionSchemas from "../../test/fixtures/transactions_schemas.json";

describe<{
	sandbox: Sandbox;
}>("Transactions", ({ it, afterAll, assert, afterEach, beforeAll, beforeEach, nock }) => {
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

	it("/transactions", async () => {
		await apiContext.transactionRepository.save(transactions);

		const { statusCode, data } = await request("/transactions", options);
		assert.equal(statusCode, 200);
		assert.equal(
			data.data,
			[...transactions].sort((a, b) => Number(b.blockHeight) - Number(a.blockHeight)),
		);
	});

	it("/transactions?type", async () => {
		await apiContext.transactionRepository.save(transactions);

		const testCases = [
			{
				path: "/transactions?type=0",
				result: [...transactions]
					.filter((tx) => tx.type === 0)
					.sort((a, b) => Number(b.blockHeight) - Number(a.blockHeight)),
			},
			{ path: "/transactions?type=1", result: [] },
			{
				path: "/transactions?type=4",
				result: [...transactions]
					.filter((tx) => tx.type === 4)
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

		const id = transactions[transactions.length - 1].id;
		const { statusCode, data } = await request(`/transactions/${id}`, options);
		assert.equal(statusCode, 200);
		assert.equal(data.data, transactions[transactions.length - 1]);
	});

	it("/transactions/unconfirmed", async () => {
		await apiContext.mempoolTransactionRepository.save(unconfirmedTransactions);

		const { statusCode, data } = await request(`/transactions/unconfirmed`, options);
		assert.equal(statusCode, 200);
		assert.equal(data.data, unconfirmedTransactions);
	});

	it("/transactions/unconfirmed/{id}", async () => {
		await apiContext.mempoolTransactionRepository.save(unconfirmedTransactions);

		const id = unconfirmedTransactions[unconfirmedTransactions.length - 1].id;

		const { statusCode, data } = await request(`/transactions/unconfirmed/${id}`, options);
		assert.equal(statusCode, 200);
		assert.equal(data.data, unconfirmedTransactions[unconfirmedTransactions.length - 1]);
	});

	it("/transactions/types", async () => {
		await apiContext.transactionTypeRepository.save(transactionTypes);

		const { statusCode, data } = await request(`/transactions/types`, options);
		assert.equal(statusCode, 200);
		assert.equal(data.data, {
			"1": {
				Transfer: 0,
				ValidatorRegistration: 2,
				Vote: 3,
				MultiSignature: 4,
				MultiPayment: 6,
				ValidatorResignation: 7,
				UsernameRegistration: 8,
				UsernameResignation: 9,
			},
		});
	});

	it("/transactions/schemas", async () => {
		await apiContext.transactionTypeRepository.save(transactionTypes);

		const { statusCode, data } = await request(`/transactions/schemas`, options);
		assert.equal(statusCode, 200);
		assert.equal(data.data, transactionSchemas);
	});
});
