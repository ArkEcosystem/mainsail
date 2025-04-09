import { describe, Sandbox } from "../../../test-framework/source";
import { prepareSandbox, ApiContext } from "../../test/helpers/prepare-sandbox";
import { request } from "../../test/helpers/request";

import transactions from "../../test/fixtures/transactions.json";
import votes from "../../test/fixtures/votes.json";
import votesResponse from "../../test/fixtures/votes.response.json";

describe<{
	sandbox: Sandbox;
}>("Votes", ({ it, afterAll, assert, afterEach, beforeAll, beforeEach, nock }) => {
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

	it("/votes", async () => {
		await apiContext.transactionRepository.save(transactions.filter((tx) => !tx.data.startsWith("0x6dd7d8ea")));
		await apiContext.transactionRepository.save(votes);

		const { statusCode, data } = await request("/votes", options);
		assert.equal(statusCode, 200);
		assert.equal(data.data, votesResponse);
	});

	it("/votes/{hash}", async () => {
		await apiContext.transactionRepository.save(votes);

		const hash = votes[votes.length - 1].hash;
		const { statusCode, data } = await request(`/votes/${hash}`, options);
		assert.equal(statusCode, 200);
		assert.equal(data.data, votesResponse[votesResponse.length - 1]);
	});
});
