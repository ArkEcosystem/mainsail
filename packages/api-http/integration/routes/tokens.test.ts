import { describe } from "@mainsail/test-runner";
import { Application } from "@mainsail/kernel";
import { prepareSandbox, ApiContext } from "../../test/helpers/prepare-sandbox";
import { request } from "../../test/helpers/request";

import tokens from "../../test/fixtures/tokens.json";
import tokenHolders from "../../test/fixtures/token_holders.json";
import tokenTransferTokens from "../../test/fixtures/token_transfer.tokens.json";
import tokenTransferTransactions from "../../test/fixtures/token_transfer.transactions.json";
import tokenActions from "../../test/fixtures/token_actions.json";
import tokenWhitelist from "../../test/fixtures/token_whitelist.json";
import tokenTransfersResponse from "../../test/fixtures/token_transfers.response.json";
import tokenApprovalsResponse from "../../test/fixtures/token_approvals.response.json";

describe<{
	app: Application;
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
		await apiContext.tokenWhitelistRepository.save(tokenWhitelist);

		const testCases = [
			{
				query: "",
				result: {
					data: [...tokens].sort((a, b) => a.address.localeCompare(b.address)),
					statusCode: 200,
				},
			},
			{
				query: "?name=DARK20",
				result: {
					data: [tokens[0]],
					statusCode: 200,
				},
			},
			{
				query: "?name=DARK21",
				result: {
					data: [tokens[1]],
					statusCode: 200,
				},
			},
			{
				query: "?name=DARK",
				result: {
					data: [tokens[0], tokens[1], tokens[2]],
					statusCode: 200,
				},
			},
			{
				query: "?name=ark22",
				result: {
					data: [tokens[2]],
					statusCode: 200,
				},
			},
			{
				query: "?name=!!",
				result: {
					data: [tokens[2]],
					statusCode: 200,
				},
			},
			{
				query: "?name=K20",
				result: {
					data: [tokens[0]],
					statusCode: 200,
				},
			},
			{
				query: "?name=asdf",
				result: {
					data: [],
					statusCode: 200,
				},
			},
		];

		for (const { query, result } of testCases) {
			const endpoint = `/tokens${query}`;
			if (result.statusCode === 404) {
				await assert.rejects(async () => request(endpoint, options), "Request failed with status code 404");
			} else {
				const { statusCode, data } = await request(endpoint, options);
				assert.equal(statusCode, result.statusCode);
				assert.equal(data.data, result.data);
			}
		}
	});

	it("/tokens?ignoreWhitelist", async () => {
		await apiContext.tokenRepository.save(tokens);

		const testCases = [
			{
				query: "?ignoreWhitelist=true",
				result: {
					data: [...tokens].sort((a, b) => a.address.localeCompare(b.address)),
					statusCode: 200,
				},
			},
			{
				query: "?ignoreWhitelist=false",
				result: {
					data: [],
					statusCode: 200,
				},
			},
			{
				query: "",
				result: {
					data: [],
					statusCode: 200,
				},
			},
		];

		for (const { query, result } of testCases) {
			const endpoint = `/tokens${query}`;
			if (result.statusCode === 404) {
				await assert.rejects(async () => request(endpoint, options), "Request failed with status code 404");
			} else {
				const { statusCode, data } = await request(endpoint, options);
				assert.equal(statusCode, result.statusCode);
				assert.equal(data.data, result.data);
			}
		}
	});

	it("/tokens?whitelist", async () => {
		await apiContext.tokenRepository.save(tokens);
		await apiContext.tokenWhitelistRepository.save(tokenWhitelist.slice(0, 1));

		const testCases = [
			{
				query: "",
				result: {
					data: [tokens[0]],
					statusCode: 200,
				},
			},
			{
				query: `?whitelist=${tokens[1].address}`,
				result: {
					data: [tokens[0], tokens[1]],
					statusCode: 200,
				},
			},
			{
				query: `?whitelist=${tokens.map((t) => t.address).join(",")}`,
				result: {
					data: [...tokens].sort((a, b) => a.address.localeCompare(b.address)),
					statusCode: 200,
				},
			},
			{
				query: `?whitelist=0x0000000000000000000000000000000000000000`,
				body: JSON.stringify({ whitelist: ["0x0000000000000000000000000000000000000000"] }),
				result: {
					data: [tokens[0]],
					statusCode: 200,
				},
			},
		];

		for (const { query, result } of testCases) {
			const endpoint = `/tokens${query}`;
			if (result.statusCode === 404) {
				await assert.rejects(async () => request(endpoint, options), "Request failed with status code 404");
			} else {
				const { statusCode, data } = await request(endpoint, { ...options });
				assert.equal(statusCode, result.statusCode);
				assert.equal(data.data, result.data);
			}
		}
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
				await assert.rejects(async () => request(endpoint, options), "Request failed with status code 404");
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
				await assert.rejects(async () => request(endpoint, options), "Request failed with status code 404");
			} else {
				const { statusCode, data } = await request(endpoint, options);
				assert.equal(statusCode, result.statusCode);
				assert.equal(data.data, result.data);
				assert.equal(data.meta.totalCount, result.data.length);
			}
		}
	});

	it("/tokens/transfers", async () => {
		await apiContext.tokenRepository.save(tokenTransferTokens);
		await apiContext.transactionRepository.save(tokenTransferTransactions);
		await apiContext.tokenActionRepository.save(tokenActions);
		await apiContext.tokenWhitelistRepository.save(tokenWhitelist);

		const testCases = [
			{
				query: "",
				result: {
					data: tokenTransfersResponse,
					statusCode: 200,
				},
			},
			{
				query: `?from=0x0000000000000000000000000000000000000000`,
				result: {
					data: tokenTransfersResponse.filter((t) => t.from === "0x0000000000000000000000000000000000000000"),
					statusCode: 200,
				},
			},
			{
				query: `?from=0x0000000000000000000000000000000000000000,0x432b093d9542B905C87587607491C369408475b4`,
				result: {
					data: tokenTransfersResponse.filter((t) =>
						[
							"0x0000000000000000000000000000000000000000",
							"0x432b093d9542B905C87587607491C369408475b4",
						].includes(t.from),
					),
					statusCode: 200,
				},
			},
			{
				query: `?to=0x0000000000000000000000000000000000000000,0x432b093d9542B905C87587607491C369408475b4`,
				result: {
					data: tokenTransfersResponse.filter((t) =>
						[
							"0x0000000000000000000000000000000000000000",
							"0x432b093d9542B905C87587607491C369408475b4",
						].includes(t.to),
					),
					statusCode: 200,
				},
			},
			{
				query: `?to=0xdead000000000000000000000000000000000001`,
				result: {
					data: [],
					statusCode: 200,
				},
			},
			{
				query: `?addresses=0x432b093d9542B905C87587607491C369408475b4`,
				result: {
					data: tokenTransfersResponse.filter(
						(t) =>
							t.from === "0x432b093d9542B905C87587607491C369408475b4" ||
							t.to === "0x432b093d9542B905C87587607491C369408475b4",
					),
					statusCode: 200,
				},
			},
			{
				query: `?addresses=0x0000000000000000000000000000000000000001`,
				result: {
					data: [],
					statusCode: 200,
				},
			},
			{
				query: "?limit=1",
				result: {
					data: tokenTransfersResponse.slice(0, 1),
					statusCode: 200,
				},
			},
		];

		for (const { query, result } of testCases) {
			const endpoint = `/tokens/transfers${query}`;
			if (result.statusCode === 404) {
				await assert.rejects(async () => request(endpoint, options), "Request failed with status code 404");
			} else {
				const { statusCode, data } = await request(endpoint, options);
				assert.equal(statusCode, result.statusCode);
				assert.equal(data.data, result.data);
			}
		}
	});

	it("/tokens/{}/transfers", async () => {
		await apiContext.tokenRepository.save(tokenTransferTokens);
		await apiContext.transactionRepository.save(tokenTransferTransactions);
		await apiContext.tokenActionRepository.save(tokenActions);
		await apiContext.tokenWhitelistRepository.save(tokenWhitelist);

		const testCases = [
			{
				query: "",
				token: tokenTransferTokens[0].address,
				result: {
					data: tokenTransfersResponse.filter((t) => t.token.address === tokenTransferTokens[0].address),
					statusCode: 200,
				},
			},
			{
				query: "",
				token: "0xdead78251073157e400c3d8d2ed92a85c958f9fa",
				result: {
					statusCode: 404,
				},
			},
		];

		for (const { query, token, result } of testCases) {
			const endpoint = `/tokens/${token}/transfers${query}`;
			if (result.statusCode === 404) {
				await assert.rejects(
					async () => request(endpoint, options),
					"Request failed with status code 404 (Not Found)",
				);
			} else {
				const { statusCode, data } = await request(endpoint, options);
				assert.equal(statusCode, result.statusCode);
				assert.equal(data.results, result.data);
			}
		}
	});

	it("/tokens/{}/approvals", async () => {
		await apiContext.tokenRepository.save(tokenTransferTokens);
		await apiContext.transactionRepository.save(tokenTransferTransactions);
		await apiContext.tokenActionRepository.save(tokenActions);
		await apiContext.tokenWhitelistRepository.save(tokenWhitelist);

		const testCases = [
			{
				query: "",
				token: tokenTransferTokens[1].address,
				result: {
					data: tokenApprovalsResponse.filter((t) => t.token.address === tokenTransferTokens[1].address),
					statusCode: 200,
				},
			},
			{
				query: "",
				token: "0xdead78251073157e400c3d8d2ed92a85c958f9fa",
				result: {
					statusCode: 404,
				},
			},
		];

		for (const { query, token, result } of testCases) {
			const endpoint = `/tokens/${token}/approvals${query}`;
			if (result.statusCode === 404) {
				await assert.rejects(async () => request(endpoint, options), "Request failed with status code 404");
			} else {
				const { statusCode, data } = await request(endpoint, options);
				assert.equal(statusCode, result.statusCode);
				assert.equal(data.results, result.data);
			}
		}
	});
});
