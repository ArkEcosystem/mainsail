import { describe } from "@mainsail/test-runner";

import { makePage, makeState, makeTransaction, TOKEN_ADDRESS, TRANSACTION_HASH } from "../../test/fixtures/entities";
import { bootstrapServer, makeRepos, Repos } from "../../test/helpers/server";
import { Server } from "../server";
import { ServiceProvider } from "../service-provider";

const makeTokenActionRow = (overrides: Record<string, unknown> = {}) => ({
	action: "Transfer",
	from: "0x1111111111111111111111111111111111111111",
	index: 0,
	to: "0x2222222222222222222222222222222222222222",
	tokenAddress: TOKEN_ADDRESS,
	tokenDecimals: 6,
	tokenName: "Test Token",
	tokenSymbol: "TEST",
	transactionHash: TRANSACTION_HASH,
	value: "1000",
	...overrides,
});

describe<{
	server: Server;
	serviceProvider: ServiceProvider;
	repos: Repos;
}>("Transactions routes", ({ it, assert, beforeEach, afterEach }) => {
	beforeEach(async (context) => {
		context.repos = makeRepos();

		const { server, serviceProvider } = await bootstrapServer(context.repos);
		context.server = server;
		context.serviceProvider = serviceProvider;
	});

	afterEach(async ({ serviceProvider }) => {
		await serviceProvider.dispose();
	});

	it("GET /api/transactions - returns enriched transactions in a pagination envelope", async ({ server, repos }) => {
		repos.transaction.data.page = makePage([makeTransaction()]);
		repos.state.data.one = makeState({ blockNumber: "100" });

		const response = await server.inject({ method: "GET", url: "/api/transactions" });

		assert.is(response.statusCode, 200);

		const body = JSON.parse(response.payload);
		assert.is(body.meta.totalCount, 1);

		const [transaction] = body.data;
		assert.equal(transaction.hash, TRANSACTION_HASH);
		assert.equal(transaction.confirmations, 11);
		assert.equal(transaction.receipt, {
			cumulativeGasUsed: 42_000,
			gasRefunded: 0,
			gasUsed: 21_000,
			status: 1,
		});
		assert.false("tokens" in transaction);
	});

	it("GET /api/transactions - includes token actions on request", async ({ server, repos }) => {
		repos.transaction.data.page = makePage([makeTransaction()]);
		repos.state.data.one = makeState();
		repos.dataSource.data.rawMany = [makeTokenActionRow()];

		const response = await server.inject({ method: "GET", url: "/api/transactions?includeTokens=true" });

		assert.is(response.statusCode, 200);

		const [transaction] = JSON.parse(response.payload).data;
		assert.equal(transaction.tokens, [
			{
				action: "Transfer",
				from: makeTokenActionRow().from,
				index: 0,
				metadata: {
					tokenAddress: TOKEN_ADDRESS,
					tokenDecimals: 6,
					tokenName: "Test Token",
					tokenSymbol: "TEST",
				},
				to: makeTokenActionRow().to,
				value: "1000",
			},
		]);

		// The lookup is a single unnest query over the page's hashes.
		const [sql, parameters] = repos.dataSource.queries[0];
		assert.true(sql.includes("unnest"));
		assert.equal(parameters[0], [TRANSACTION_HASH]);
	});

	it("GET /api/transactions - exposes logs and output with a full receipt", async ({ server, repos }) => {
		repos.transaction.data.page = makePage([makeTransaction({ logs: [{ topics: [] }], output: "0xdeadbeef" })]);
		repos.state.data.one = makeState();

		const response = await server.inject({ method: "GET", url: "/api/transactions?fullReceipt=true" });

		const [transaction] = JSON.parse(response.payload).data;
		assert.equal(transaction.receipt.logs, [{ topics: [] }]);
		assert.equal(transaction.receipt.output, "0xdeadbeef");
	});

	it("GET /api/transactions - forwards criteria, sorting, pagination and options to the repository", async ({
		server,
		repos,
	}) => {
		await server.inject({
			method: "GET",
			url: `/api/transactions?from=${makeTransaction().from}&limit=25&orderBy=nonce:asc`,
		});

		const [, criteria, sorting, pagination, options] = repos.transaction.calls.findManyByCriteria[0];
		assert.equal(criteria.from, makeTransaction().from);
		assert.equal(sorting, [{ direction: "asc", property: "nonce" }]);
		assert.equal(pagination, { limit: 25, offset: 0 });
		assert.equal(options, { estimateTotalCount: true, fullReceipt: false });
	});

	it("GET /api/transactions - rejects an unknown orderBy property", async ({ server }) => {
		const response = await server.inject({ method: "GET", url: "/api/transactions?orderBy=nope:asc" });

		assert.is(response.statusCode, 422);
	});

	it("GET /api/transactions/{hash} - returns the enriched transaction", async ({ server, repos }) => {
		repos.transaction.data.one = makeTransaction({ decodedError: "out of gas", status: 0 });
		repos.state.data.one = makeState();

		const response = await server.inject({ method: "GET", url: `/api/transactions/${TRANSACTION_HASH}` });

		assert.is(response.statusCode, 200);

		const { data } = JSON.parse(response.payload);
		assert.equal(data.hash, TRANSACTION_HASH);
		assert.equal(data.receipt.status, 0);
		assert.equal(data.receipt.decodedError, "out of gas");
		assert.false("tokens" in data);
	});

	it("GET /api/transactions/{hash} - includes token actions on request", async ({ server, repos }) => {
		repos.transaction.data.one = makeTransaction();
		repos.state.data.one = makeState();
		repos.dataSource.data.rawMany = [makeTokenActionRow()];

		const response = await server.inject({
			method: "GET",
			url: `/api/transactions/${TRANSACTION_HASH}?includeTokens=true`,
		});

		assert.is(response.statusCode, 200);
		assert.length(JSON.parse(response.payload).data.tokens, 1);
	});

	it("GET /api/transactions/{hash} - responds 404 for an unknown hash", async ({ server }) => {
		const response = await server.inject({ method: "GET", url: `/api/transactions/${"f".repeat(64)}` });

		assert.is(response.statusCode, 404);
	});

	it("GET /api/transactions/{hash} - rejects a malformed hash", async ({ server }) => {
		const response = await server.inject({ method: "GET", url: "/api/transactions/nope" });

		assert.is(response.statusCode, 422);
	});
});
