import { describe } from "@mainsail/test-runner";

import { ADDRESS_A, ADDRESS_B, makeToken, TOKEN_ADDRESS, TRANSACTION_HASH } from "../../test/fixtures/entities";
import { bootstrapServer, makeRepos, Repos } from "../../test/helpers/server";
import { Server } from "../server";
import { ServiceProvider } from "../service-provider";

const makeTransferRow = (overrides: Record<string, unknown> = {}) => ({
	blockNumber: "90",
	from: ADDRESS_A,
	functionSig: Buffer.from("a9059cbb", "hex"),
	timestamp: "1720000000000",
	to: ADDRESS_B,
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
}>("Tokens routes", ({ it, assert, beforeEach, afterEach }) => {
	beforeEach(async (context) => {
		context.repos = makeRepos();

		const { server, serviceProvider } = await bootstrapServer(context.repos);
		context.server = server;
		context.serviceProvider = serviceProvider;
	});

	afterEach(async ({ serviceProvider }) => {
		await serviceProvider.dispose();
	});

	it("GET /api/tokens - lists whitelisted tokens", async ({ server, repos }) => {
		repos.token.data.manyAndCount = [[makeToken()], 1];

		const response = await server.inject({ method: "GET", url: "/api/tokens" });

		assert.is(response.statusCode, 200);

		const body = JSON.parse(response.payload);
		assert.is(body.meta.totalCount, 1);
		assert.equal(body.data[0].address, TOKEN_ADDRESS);

		// By default only whitelisted tokens are listed.
		const [, , joinCondition] = repos.token.qb.calls.innerJoin[0];
		assert.equal(joinCondition, "tw.address = tok.address");
	});

	it("GET /api/tokens - skips the whitelist on request", async ({ server, repos }) => {
		repos.token.data.manyAndCount = [[makeToken()], 1];

		await server.inject({ method: "GET", url: "/api/tokens?ignoreWhitelist=true" });

		assert.undefined(repos.token.qb.calls.innerJoin);
		assert.undefined(repos.token.qb.calls.leftJoin);
	});

	it("GET /api/tokens - extends the whitelist with custom addresses", async ({ server, repos }) => {
		repos.token.data.manyAndCount = [[makeToken()], 1];

		await server.inject({ method: "GET", url: `/api/tokens?whitelist=${ADDRESS_A}` });

		// A custom whitelist switches to a left join with an OR condition.
		assert.defined(repos.token.qb.calls.leftJoin);
		assert.undefined(repos.token.qb.calls.innerJoin);
	});

	const replayBrackets = (bracket: any): any[][] => {
		const replayed: any[][] = [];
		const recorder: any = {
			orWhere: (...args: any[]) => {
				replayed.push(args);
				return recorder;
			},
			where: (...args: any[]) => {
				replayed.push(args);
				return recorder;
			},
		};
		bracket.whereFactory(recorder);
		return replayed;
	};

	it("GET /api/tokens - searches short names with a prefix and long names with a trigram match", async ({
		server,
		repos,
	}) => {
		repos.token.data.manyAndCount = [[makeToken()], 1];

		await server.inject({ method: "GET", url: "/api/tokens?name=te" });
		await server.inject({ method: "GET", url: "/api/tokens?name=test" });

		// Short queries use the prefix index ...
		assert.equal(replayBrackets(repos.token.qb.calls.andWhere[0][0]), [
			["lower(tok.symbol) LIKE :prefix", { prefix: "te%" }],
			["lower(tok.name) LIKE :prefix", { prefix: "te%" }],
		]);
		// ... longer queries the trigram index.
		assert.equal(replayBrackets(repos.token.qb.calls.andWhere[1][0]), [
			["tok.symbol ILIKE :like", { like: "%test%" }],
			["tok.name ILIKE :like", { like: "%test%" }],
		]);

		// Both name searches rank prefix matches first.
		assert.length(repos.token.qb.calls.addSelect, 2);
		assert.equal(repos.token.qb.calls.setParameter[0], ["orderByPrefix", "te%"]);
		assert.equal(repos.token.qb.calls.setParameter[1], ["orderByPrefix", "test%"]);
	});

	it("GET /api/tokens/transfers - excludes custom blacklisted tokens", async ({ server, repos }) => {
		await server.inject({ method: "GET", url: `/api/tokens/transfers?blacklist=${ADDRESS_A}` });

		const blacklisted = (repos.tokenAction.qb.calls.andWhere ?? []).find(
			([condition]) => condition === "tok.address NOT IN (:...customBlacklist)",
		);
		assert.defined(blacklisted);
		assert.equal(blacklisted![1], { customBlacklist: [ADDRESS_A] });
	});

	it("GET /api/tokens/{address} - returns the token", async ({ server, repos }) => {
		repos.token.data.one = makeToken();

		const response = await server.inject({ method: "GET", url: `/api/tokens/${TOKEN_ADDRESS}` });

		assert.is(response.statusCode, 200);
		assert.equal(JSON.parse(response.payload).data.symbol, "TEST");
	});

	it("GET /api/tokens/{address} - responds 404 for an unknown token", async ({ server }) => {
		const response = await server.inject({ method: "GET", url: `/api/tokens/${TOKEN_ADDRESS}` });

		assert.is(response.statusCode, 404);
		assert.equal(JSON.parse(response.payload).message, "Token not found");
	});

	it("GET /api/tokens/{address} - rejects a malformed address", async ({ server }) => {
		const response = await server.inject({ method: "GET", url: "/api/tokens/nope" });

		assert.is(response.statusCode, 422);
	});

	it("GET /api/tokens/{address}/holders - lists the holders of the token", async ({ server, repos }) => {
		repos.token.data.one = makeToken();
		repos.tokenHolder.data.manyAndCount = [
			[{ address: ADDRESS_A, balance: "12000000", tokenAddress: TOKEN_ADDRESS }],
			1,
		];

		const response = await server.inject({ method: "GET", url: `/api/tokens/${TOKEN_ADDRESS}/holders` });

		assert.is(response.statusCode, 200);

		// The holders route is not wrapped by the pagination plugin.
		const body = JSON.parse(response.payload);
		assert.is(body.totalCount, 1);
		assert.equal(body.results[0].address, ADDRESS_A);
	});

	it("GET /api/tokens/{address}/holders - responds 404 for an unknown token", async ({ server }) => {
		const response = await server.inject({ method: "GET", url: `/api/tokens/${TOKEN_ADDRESS}/holders` });

		assert.is(response.statusCode, 404);
	});

	it("GET /api/tokens/transfers - lists transfer actions with token metadata", async ({ server, repos }) => {
		repos.tokenAction.data.rawMany = [makeTransferRow()];
		repos.tokenAction.data.rawOne = { cnt: "1" };

		const response = await server.inject({ method: "GET", url: "/api/tokens/transfers" });

		assert.is(response.statusCode, 200);

		const body = JSON.parse(response.payload);
		assert.is(body.meta.totalCount, 1);
		assert.equal(body.data[0], {
			blockNumber: "90",
			from: ADDRESS_A,
			functionSig: "0xa9059cbb",
			timestamp: "1720000000000",
			to: ADDRESS_B,
			token: { address: TOKEN_ADDRESS, decimals: 6, name: "Test Token", symbol: "TEST" },
			transactionHash: TRANSACTION_HASH,
			value: "1000",
		});

		// The action filter selects transfers.
		assert.equal(repos.tokenAction.qb.calls.where[0], ["tf.action = :action", { action: "Transfer" }]);
	});

	it("GET /api/tokens/approvals - filters for approval actions", async ({ server, repos }) => {
		await server.inject({ method: "GET", url: "/api/tokens/approvals" });

		assert.equal(repos.tokenAction.qb.calls.where[0], ["tf.action = :action", { action: "Approval" }]);
	});

	it("GET /api/tokens/transfers - filters by transaction hash and both directions of an address list", async ({
		server,
		repos,
	}) => {
		await server.inject({
			method: "GET",
			url: `/api/tokens/transfers?transactionHash=${TRANSACTION_HASH}&addresses=${ADDRESS_A}`,
		});

		const flat = (repos.tokenAction.qb.calls.andWhere ?? []).map(([condition]) => condition);
		assert.true(flat.includes("tf.transaction_hash = :transactionHash"));
		// The addresses filter is applied as a bracketed from/to OR condition.
		assert.true(flat.some((condition) => typeof condition === "object"));
	});

	it("GET /api/tokens/transfers - filters by from and to lists", async ({ server, repos }) => {
		await server.inject({
			method: "GET",
			url: `/api/tokens/transfers?from=${ADDRESS_A}&to=${ADDRESS_B}`,
		});

		const conditions = (repos.tokenAction.qb.calls.andWhere ?? []).map(([condition]) => condition);
		assert.true(conditions.includes("tf.from IN (:...from)"));
		assert.true(conditions.includes("tf.to IN (:...to)"));
	});

	it("GET /api/tokens/transfers - matches comma separated address lists in both directions", async ({
		server,
		repos,
	}) => {
		await server.inject({
			method: "GET",
			url: `/api/tokens/transfers?addresses=${ADDRESS_A},${ADDRESS_B}`,
		});

		// The addresses filter is a bracketed from-or-to condition; replay it to see its parameters.
		const [bracket] = repos.tokenAction.qb.calls.andWhere.at(-1)!;
		const replayed: any[][] = [];
		const recorder: any = {
			orWhere: (...args: any[]) => {
				replayed.push(args);
				return recorder;
			},
			where: (...args: any[]) => {
				replayed.push(args);
				return recorder;
			},
		};
		bracket.whereFactory(recorder);

		assert.equal(replayed, [
			["tf.from IN (:...addresses)", { addresses: [ADDRESS_A, ADDRESS_B] }],
			["tf.to IN (:...addresses)", { addresses: [ADDRESS_A, ADDRESS_B] }],
		]);
	});

	it("GET /api/tokens/transfers - accepts comma separated from and to lists", async ({ server, repos }) => {
		await server.inject({
			method: "GET",
			url: `/api/tokens/transfers?from=${ADDRESS_A},${ADDRESS_B}&to=${ADDRESS_A},${ADDRESS_B}`,
		});

		const parameters = (repos.tokenAction.qb.calls.andWhere ?? []).map(([, parameter]) => parameter);
		assert.true(parameters.some((p) => Array.isArray(p?.from) && p.from.length === 2));
		assert.true(parameters.some((p) => Array.isArray(p?.to) && p.to.length === 2));
	});

	it("GET /api/tokens/{address}/transfers - scopes the actions to the token", async ({ server, repos }) => {
		repos.token.data.one = makeToken();
		repos.tokenAction.data.rawMany = [makeTransferRow()];
		repos.tokenAction.data.rawOne = { cnt: "1" };

		const response = await server.inject({ method: "GET", url: `/api/tokens/${TOKEN_ADDRESS}/transfers` });

		assert.is(response.statusCode, 200);

		const conditions = (repos.tokenAction.qb.calls.andWhere ?? []).map(([condition]) => condition);
		assert.true(conditions.includes("tf.address = :address"));
	});

	it("GET /api/tokens/{address}/transfers - responds 404 for an unknown token", async ({ server }) => {
		const response = await server.inject({ method: "GET", url: `/api/tokens/${TOKEN_ADDRESS}/transfers` });

		assert.is(response.statusCode, 404);
	});

	it("GET /api/tokens/{address}/approvals - scopes the actions to the token", async ({ server, repos }) => {
		repos.token.data.one = makeToken();

		const response = await server.inject({ method: "GET", url: `/api/tokens/${TOKEN_ADDRESS}/approvals` });

		assert.is(response.statusCode, 200);
		assert.equal(repos.tokenAction.qb.calls.where[0], ["tf.action = :action", { action: "Approval" }]);
	});

	it("GET /api/tokens/whitelist - lists the whitelist entries", async ({ server, repos }) => {
		repos.tokenWhitelist.data.manyAndCount = [
			[{ address: TOKEN_ADDRESS, comment: "popular", createdAt: "2026-01-01T00:00:00.000Z" }],
			1,
		];

		const response = await server.inject({ method: "GET", url: "/api/tokens/whitelist" });

		assert.is(response.statusCode, 200);

		const body = JSON.parse(response.payload);
		assert.is(body.meta.totalCount, 1);
		assert.equal(body.data[0].address, TOKEN_ADDRESS);
	});
});
