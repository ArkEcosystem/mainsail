import { describe, Sandbox } from "../../../test-framework/source";
import { prepareSandbox, ApiContext } from "../../test/helpers/prepare-sandbox";
import { request } from "../../test/helpers/request";

import validatorRounds from "../../test/fixtures/validator-rounds.json";
import validatorRound from "../../test/fixtures/validator-round.json";
import wallets from "../../test/fixtures/wallets.json";

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
		await apiContext.walletRepository.save(wallets);
	});

	afterEach(async (context) => {
		await apiContext.reset();
	});

	it("/rounds", async () => {
		let { statusCode, data } = await request("/rounds", options);
		assert.equal(statusCode, 200);
		assert.empty(data.data);

		await apiContext.validatorRoundRepository.save(validatorRounds);

		({ statusCode, data } = await request("/rounds", options));
		assert.equal(data.data, validatorRounds);
	});

	it("/rounds/{round}", async () => {
		await apiContext.validatorRoundRepository.save(validatorRounds);

		const testCases = [
			{
				round: 1,
				result: {
					data: validatorRounds.find((v) => v.round === "1"),
					statusCode: 200,
				},
			},
			{
				round: 2,
				statusCode: 200,
				result: {
					data: validatorRounds.find((v) => v.round === "2"),
					statusCode: 200,
				},
			},
			{
				round: 3,
				result: {
					statusCode: 404,
				},
			},
			{
				round: 99,
				result: {
					statusCode: 404,
				},
			},
		];

		for (const { round, result } of testCases) {
			const endpoint = `/rounds/${round}`;
			if (result.statusCode === 404) {
				await assert.rejects(async () => request(endpoint, options), "Response code 404 (Not Found)");
			} else {
				const { statusCode, data } = await request(endpoint, options);
				assert.equal(statusCode, result.statusCode);
				assert.equal(data.data, result.data);
			}
		}
	});

	it("/rounds/{id}/delegates", async () => {
		await apiContext.validatorRoundRepository.save(validatorRounds);
		const { statusCode, data } = await request("/rounds/1/delegates", options);
		assert.equal(statusCode, 200);
		assert.equal(data.data, validatorRound);
	});
});
