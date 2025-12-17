import { describe, Sandbox } from "../../../test-framework/source";
import { prepareSandbox, ApiContext } from "../../test/helpers/prepare-sandbox";
import { request } from "../../test/helpers/request";

import tokens from "../../test/fixtures/tokens.json";
import tokenHolders from "../../test/fixtures/token_holders.json";

describe<{
	sandbox: Sandbox;
}>("Tokens", ({ it, afterAll, assert, afterEach, beforeAll, beforeEach, nock }) => {
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

	it("/tokens", async () => {
		await apiContext.tokenRepository.save(tokens);

		const { statusCode, data } = await request("/tokens", options);
		assert.equal(statusCode, 200);
		assert.equal(data.data, tokens);
	});

	it("/tokens/{}", async () => {
		await apiContext.tokenRepository.save(tokens);

		const testCases = [
			{
				token: tokens[0],
				result: {
					data: tokens[0],
					statusCode: 200,
				},
			},
			{
				token: tokens[1],
				result: {
					data: tokens[1],
					statusCode: 200,
				},
			},
			{
				token: { address: "0x0000000000000000000000000000000000000000" },
				result: {
					data: [],
					statusCode: 404,
				},
			},
		];

		for (const { token, result } of testCases) {
			const endpoint = `/tokens/${token.address}`;
			if (result.statusCode === 404) {
				await assert.rejects(async () => request(endpoint, options), "Response code 404 (Not Found)");
			} else {
				const { statusCode, data } = await request(endpoint, options);
				assert.equal(statusCode, result.statusCode);
				assert.equal(data.data, result.data);
			}
		}
	});

	it("/tokens/{}/holders", async () => {
		await apiContext.tokenRepository.save(tokens);
		await apiContext.tokenHolderRepository.save(tokenHolders);

		const { statusCode, data } = await request(`/tokens/${tokens[1].address}/holders`, options);
		assert.equal(statusCode, 200);

		const testCases = [
			{
				token: tokens[0],
				result: {
					data: tokenHolders.filter((t) => t.tokenAddress === tokens[0].address),
					statusCode: 200,
				},
			},
			{
				token: tokens[1],
				result: {
					data: tokenHolders.filter((t) => t.tokenAddress === tokens[1].address),
					statusCode: 200,
				},
			},
			{
				token: { address: "0x0000000000000000000000000000000000000000" },
				result: {
					data: [],
					statusCode: 404,
				},
			},
		];

		for (const { token, result } of testCases) {
			const endpoint = `/tokens/${token.address}/holders`;
			if (result.statusCode === 404) {
				await assert.rejects(async () => request(endpoint, options), "Response code 404 (Not Found)");
			} else {
				const { statusCode, data } = await request(endpoint, options);
				assert.equal(statusCode, result.statusCode);
				assert.equal(data.results, result.data);
			}
		}
	});
});
