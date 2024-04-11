import cryptoJson from "../../../core/bin/config/testnet/core/crypto.json";
import { describe, Sandbox } from "../../../test-framework/source";
import nodeConfiguration from "../../test/fixtures/node_configuration.json";
import nodeFees from "../../test/fixtures/node_fees.json";
import transactions from "../../test/fixtures/transactions.json";
import transactionTypes from "../../test/fixtures/transactions_types.json";
import { ApiContext, prepareSandbox } from "../../test/helpers/prepare-sandbox";
import { request } from "../../test/helpers/request";

describe<{
	sandbox: Sandbox;
}>("Node", ({ it, afterAll, assert, afterEach, beforeAll, beforeEach, nock }) => {
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

	it("/node/status", async () => {
		const { statusCode, data } = await request("/node/status", options);
		assert.equal(statusCode, 200);

		assert.number(data.data.blocksCount);
		assert.boolean(data.data.synced);
		assert.number(data.data.now);
		assert.number(data.data.timestamp);
	});

	it("/node/syncing", async () => {
		const { statusCode, data } = await request("/node/syncing", options);
		assert.equal(statusCode, 200);
		assert.equal(data.data, {
			blocks: 0,
			height: 0,
			id: 0,
			syncing: false,
		});
	});

	it("/node/configuration", async () => {
		await apiContext.configurationRepository.save({
			activeMilestones: cryptoJson.milestones[0],
			cryptoConfiguration: cryptoJson,
			id: 1,
			version: "0.0.1",
		});

		const { statusCode, data } = await request(`/node/configuration`, options);
		assert.equal(statusCode, 200);
		assert.equal(data.data, nodeConfiguration);
	});

	it("/node/configuration/crypto", async () => {
		await apiContext.configurationRepository.save({
			activeMilestones: cryptoJson.milestones[0],
			cryptoConfiguration: cryptoJson,
			id: 1,
			version: "0.0.1",
		});

		const { statusCode, data } = await request(`/node/configuration/crypto`, options);
		assert.equal(statusCode, 200);
		assert.equal(data.data, cryptoJson);
	});

	it("/node/fees", async () => {
		await apiContext.configurationRepository.save({
			activeMilestones: cryptoJson.milestones[0],
			cryptoConfiguration: cryptoJson,
			id: 1,
			version: "0.0.1",
		});

		await apiContext.transactionTypeRepository.save(transactionTypes);
		await apiContext.transactionRepository.save(
			transactions.map((tx) => ({ ...tx, timestamp: Math.floor(new Date().getTime()) })),
		);

		const { statusCode, data } = await request(`/node/fees`, options);
		assert.equal(statusCode, 200);
		assert.equal(data.data, nodeFees);
	});
});
