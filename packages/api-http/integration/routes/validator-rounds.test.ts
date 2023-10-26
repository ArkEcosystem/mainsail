import { describe, Sandbox } from "../../../test-framework";
import { prepareSandbox, ApiContext } from "../../test/helpers/prepare-sandbox";
import { request } from "../../test/helpers/request";

import validatorRounds from "../../test/fixtures/validator-rounds.json";
import validatorRound from "../../test/fixtures/validator-round.json";

describe<{
	sandbox: Sandbox;
}>("ValidatorRounds", ({ it, afterAll, assert, afterEach, beforeAll, beforeEach, nock }) => {
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

	it("/validator-rounds", async () => {
		let { statusCode, data } = await request("/validator-rounds", options);
		assert.equal(statusCode, 200);
		assert.empty(data.data);

		await apiContext.validatorRoundRepository.save(validatorRounds);

		({ statusCode, data } = await request("/validator-rounds", options));
		assert.equal(data.data, validatorRounds);
	});

	it("/rounds/{id}/delegates", async () => {
		await apiContext.validatorRoundRepository.save(validatorRounds);
		const { statusCode, data } = await request("/rounds/1/delegates", options);
		assert.equal(statusCode, 200);
		assert.equal(data.data, validatorRound);
	});
});
