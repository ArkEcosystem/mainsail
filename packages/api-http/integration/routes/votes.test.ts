import { describe, Sandbox } from "../../../test-framework/source";
import { prepareSandbox, ApiContext } from "../../test/helpers/prepare-sandbox";
import { request } from "../../test/helpers/request";

import transactions from "../../test/fixtures/transactions.json";
import votes from "../../test/fixtures/votes.json";

describe<{
	sandbox: Sandbox;
}>("Votes", ({ it, afterAll, assert, afterEach, beforeAll, beforeEach, nock }) => {
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

	it("/votes", async () => {
		await apiContext.transactionRepository.save(transactions);
		await apiContext.transactionRepository.save(votes);

		const { statusCode, data } = await request("/votes", options);
		assert.equal(statusCode, 200);
		assert.equal(data.data, votes);
	});

	it("/votes/{id}", async () => {
		await apiContext.transactionRepository.save(votes);

		const id = votes[votes.length - 1].id;
		const { statusCode, data } = await request(`/votes/${id}`, options);
		assert.equal(statusCode, 200);
		assert.equal(data.data, votes[votes.length - 1]);
	});
});
