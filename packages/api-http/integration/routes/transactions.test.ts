import { describe, Sandbox } from "../../../test-framework/source";
import { prepareSandbox, ApiContext } from "../../test/helpers/prepare-sandbox";
import { request } from "../../test/helpers/request";

import cryptoJson from "../../../core/bin/config/testnet/core/crypto.json";
import transactions from "../../test/fixtures/transactions.json";
import transactionTypes from "../../test/fixtures/transactions_types.json";
import transactionSchemas from "../../test/fixtures/transactions_schemas.json";
import transactionFees from "../../test/fixtures/transactions_fees.json";

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

		const id = transactions[transactions.length - 1].id;
		const { statusCode, data } = await request(`/transactions/${id}`, options);
		assert.equal(statusCode, 200);
		assert.equal(data.data, transactions[transactions.length - 1]);
	});

	it("/transactions/schemas", async () => {
		await apiContext.transactionTypeRepository.save(transactionTypes);

		const { statusCode, data } = await request(`/transactions/schemas`, options);
		assert.equal(statusCode, 200);
		assert.equal(data.data, transactionSchemas);
	});

	it("/transactions/fees", async () => {
		await apiContext.transactionTypeRepository.save(transactionTypes);
		await apiContext.configurationRepository.save({
			activeMilestones: cryptoJson.milestones[0],
			cryptoConfiguration: cryptoJson,
			id: 1,
			version: "0.0.1",
		});

		const { statusCode, data } = await request(`/transactions/fees`, {});
		assert.equal(statusCode, 200);
		assert.equal(data.data, transactionFees);
	});
});
