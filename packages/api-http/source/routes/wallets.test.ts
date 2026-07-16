import { describe } from "@mainsail/test-runner";

import {
	ADDRESS_A,
	ADDRESS_B,
	makePage,
	makeState,
	makeToken,
	makeTransaction,
	makeWallet,
	PUBLIC_KEY,
	TOKEN_ADDRESS,
	TRANSACTION_HASH,
} from "../../test/fixtures/entities";
import { bootstrapServer, makeRepos, Repos } from "../../test/helpers/server";
import { Server } from "../server";
import { ServiceProvider } from "../service-provider";

const VOTE_FUNCTION_SIG = "0x6dd7d8ea";

describe<{
	server: Server;
	serviceProvider: ServiceProvider;
	repos: Repos;
	app: any;
}>("Wallets routes", ({ it, assert, beforeEach, afterEach }) => {
	beforeEach(async (context) => {
		context.repos = makeRepos();

		const { app, server, serviceProvider } = await bootstrapServer(context.repos);
		context.app = app;
		context.server = server;
		context.serviceProvider = serviceProvider;
	});

	afterEach(async ({ serviceProvider }) => {
		await serviceProvider.dispose();
	});

	it("GET /api/wallets - returns wallets in a pagination envelope", async ({ server, repos }) => {
		repos.wallet.data.page = makePage([makeWallet()]);

		const response = await server.inject({ method: "GET", url: "/api/wallets" });

		assert.is(response.statusCode, 200);
		assert.equal(JSON.parse(response.payload).data[0].address, ADDRESS_A);
	});

	it("GET /api/wallets/top - returns wallets in a pagination envelope", async ({ server, repos }) => {
		repos.wallet.data.page = makePage([makeWallet()]);

		const response = await server.inject({ method: "GET", url: "/api/wallets/top" });

		assert.is(response.statusCode, 200);
		assert.equal(JSON.parse(response.payload).data[0].balance, "1000");
	});

	it("GET /api/wallets/{id} - returns the wallet", async ({ server, repos }) => {
		repos.wallet.data.one = makeWallet();

		const response = await server.inject({ method: "GET", url: `/api/wallets/${ADDRESS_A}` });

		assert.is(response.statusCode, 200);
		assert.equal(JSON.parse(response.payload).data.address, ADDRESS_A);

		// The wallet is matched by address, public key or username.
		assert.equal(repos.wallet.qb.calls.where[0], ["address = :address", { address: ADDRESS_A }]);
		assert.equal(repos.wallet.qb.calls.orWhere[0], ["public_key = :publicKey", { publicKey: ADDRESS_A }]);
		assert.equal(repos.wallet.qb.calls.orWhere[1], [
			"attributes @> :username",
			{ username: { username: ADDRESS_A } },
		]);
	});

	it("GET /api/wallets/{id} - responds 404 for an unknown wallet", async ({ server }) => {
		const response = await server.inject({ method: "GET", url: `/api/wallets/${ADDRESS_A}` });

		assert.is(response.statusCode, 404);
	});

	it("GET /api/wallets/{id}/transactions - filters by the wallet address", async ({ server, repos }) => {
		repos.wallet.data.one = makeWallet();
		repos.transaction.data.page = makePage([makeTransaction()]);
		repos.state.data.one = makeState();

		// Request by username so the criteria provably comes from the resolved wallet's address.
		const response = await server.inject({ method: "GET", url: "/api/wallets/genesis/transactions" });

		assert.is(response.statusCode, 200);
		assert.equal(JSON.parse(response.payload).data[0].hash, TRANSACTION_HASH);

		const [, criteria] = repos.transaction.calls.findManyByCriteria[0];
		assert.equal(criteria.address, ADDRESS_A);
	});

	it("GET /api/wallets/{id}/transactions - responds 404 for an unknown wallet", async ({ server }) => {
		const response = await server.inject({ method: "GET", url: `/api/wallets/${ADDRESS_A}/transactions` });

		assert.is(response.statusCode, 404);
	});

	it("GET /api/wallets/{id}/transactions/sent - filters by the sender public key", async ({ server, repos }) => {
		repos.wallet.data.one = makeWallet();
		repos.transaction.data.page = makePage([makeTransaction()]);
		repos.state.data.one = makeState();

		const response = await server.inject({
			method: "GET",
			url: `/api/wallets/${ADDRESS_A}/transactions/sent`,
		});

		assert.is(response.statusCode, 200);

		const [, criteria] = repos.transaction.calls.findManyByCriteria[0];
		assert.equal(criteria.senderPublicKey, PUBLIC_KEY);
	});

	it("GET /api/wallets/{id}/transactions/sent - returns an empty page for a wallet without a public key", async ({
		server,
		repos,
	}) => {
		repos.wallet.data.one = makeWallet({ publicKey: undefined });

		const response = await server.inject({
			method: "GET",
			url: `/api/wallets/${ADDRESS_A}/transactions/sent`,
		});

		assert.is(response.statusCode, 200);
		assert.equal(JSON.parse(response.payload).data, []);
		assert.undefined(repos.transaction.calls.findManyByCriteria);
	});

	it("GET /api/wallets/{id}/transactions/received - filters by the recipient address", async ({ server, repos }) => {
		repos.wallet.data.one = makeWallet();
		repos.transaction.data.page = makePage([makeTransaction()]);
		repos.state.data.one = makeState();

		// Request by username so the criteria provably comes from the resolved wallet's address.
		await server.inject({ method: "GET", url: "/api/wallets/genesis/transactions/received" });

		const [, criteria] = repos.transaction.calls.findManyByCriteria[0];
		assert.equal(criteria.to, ADDRESS_A);
	});

	it("GET /api/wallets/{id}/votes - filters by the vote function signature", async ({ server, repos }) => {
		repos.wallet.data.one = makeWallet();
		repos.transaction.data.page = makePage([makeTransaction({ data: VOTE_FUNCTION_SIG })]);
		repos.state.data.one = makeState();

		const response = await server.inject({ method: "GET", url: `/api/wallets/${ADDRESS_A}/votes` });

		assert.is(response.statusCode, 200);

		const [, criteria] = repos.transaction.calls.findManyByCriteria[0];
		assert.equal(criteria.data, VOTE_FUNCTION_SIG);
		assert.equal(criteria.senderPublicKey, PUBLIC_KEY);
	});

	it("GET /api/wallets/{id}/votes - returns an empty page for a wallet without a public key", async ({
		server,
		repos,
	}) => {
		repos.wallet.data.one = makeWallet({ publicKey: undefined });

		const response = await server.inject({ method: "GET", url: `/api/wallets/${ADDRESS_A}/votes` });

		assert.is(response.statusCode, 200);
		assert.equal(JSON.parse(response.payload).data, []);
	});

	it("GET /api/wallets/tokens - aggregates holder balances per token", async ({ server, repos }) => {
		// Page of matching token metadata + its total count.
		repos.token.data.rawMany = [
			{ decimals: 6, name: "Test Token", supply: "1000000000", symbol: "TEST", token: TOKEN_ADDRESS },
		];
		repos.token.data.rawOne = { cnt: "1" };
		// Holder rows for the page tokens.
		repos.tokenHolder.data.rawMany = [
			{ address: ADDRESS_A, balance: "12000000", token: TOKEN_ADDRESS },
			{ address: ADDRESS_B, balance: "10000000", token: TOKEN_ADDRESS },
		];

		const response = await server.inject({
			method: "GET",
			url: `/api/wallets/tokens?addresses=${ADDRESS_A},${ADDRESS_B}`,
		});

		assert.is(response.statusCode, 200);

		const body = JSON.parse(response.payload);
		assert.is(body.meta.totalCount, 1);
		assert.equal(body.data, [
			{
				addresses: { [ADDRESS_A]: "12000000", [ADDRESS_B]: "10000000" },
				decimals: 6,
				name: "Test Token",
				supply: "1000000000",
				symbol: "TEST",
				token: TOKEN_ADDRESS,
			},
		]);
	});

	it("GET /api/wallets/tokens - returns an empty page without addresses", async ({ server, repos }) => {
		const response = await server.inject({ method: "GET", url: "/api/wallets/tokens" });

		assert.is(response.statusCode, 200);
		assert.equal(JSON.parse(response.payload).data, []);
		assert.undefined(repos.token.qb.calls.getRawMany);
	});

	it("GET /api/wallets/tokens - skips the holder lookup when no token matches", async ({ server, repos }) => {
		repos.token.data.rawMany = [];
		repos.token.data.rawOne = undefined;

		const response = await server.inject({
			method: "GET",
			url: `/api/wallets/tokens?addresses=${ADDRESS_A}`,
		});

		assert.is(response.statusCode, 200);

		const body = JSON.parse(response.payload);
		assert.is(body.meta.totalCount, 0);
		assert.equal(body.data, []);
		assert.undefined(repos.tokenHolder.qb.calls.getRawMany);
	});

	it("GET /api/wallets/{id}/tokens - lists the holdings of the wallet", async ({ server, repos }) => {
		repos.wallet.data.one = makeWallet();
		repos.tokenHolder.data.rawMany = [
			{
				address: ADDRESS_A,
				balance: "12000000",
				decimals: 6,
				name: makeToken().name,
				supply: makeToken().totalSupply,
				symbol: makeToken().symbol,
				tokenAddress: TOKEN_ADDRESS,
			},
		];
		repos.tokenHolder.data.rawOne = { cnt: "1" };

		const response = await server.inject({ method: "GET", url: `/api/wallets/${ADDRESS_A}/tokens` });

		assert.is(response.statusCode, 200);

		const body = JSON.parse(response.payload);
		assert.is(body.meta.totalCount, 1);
		assert.equal(body.data[0].tokenAddress, TOKEN_ADDRESS);
		assert.equal(body.data[0].balance, "12000000");
	});

	it("GET /api/wallets/{id}/tokens - filters by token address and falls back to the id", async ({
		server,
		repos,
	}) => {
		// Wallet lookup misses -> the raw id is used as holder address.
		await server.inject({
			method: "GET",
			url: `/api/wallets/${ADDRESS_B}/tokens?tokenAddress=${TOKEN_ADDRESS}`,
		});

		assert.equal(repos.tokenHolder.qb.calls.where[0], ["th.address = :address", { address: ADDRESS_B }]);
		assert.equal(repos.tokenHolder.qb.calls.andWhere[0], [
			"th.token_address = :tokenAddress",
			{ tokenAddress: TOKEN_ADDRESS },
		]);
		// Without a minBalance query parameter, the configured default applies.
		assert.equal(repos.tokenHolder.qb.calls.andWhere[1], [
			"th.balance / POW(10, tok.decimals) >= :minBalance",
			{ minBalance: 0.01 },
		]);
	});

	it("GET /api/wallets/activity - merges transactions and token actions", async ({ server, repos }) => {
		repos.dataSource.data.rawMany = [
			{
				action: undefined,
				blockNumber: 90,
				from: ADDRESS_A,
				functionSig: Buffer.from("6dd7d8ea", "hex"),
				index: undefined,
				timestamp: 1_720_000_000,
				to: ADDRESS_B,
				tokenAddress: undefined,
				transactionHash: TRANSACTION_HASH,
				transactionIndex: 0,
				value: "5",
			},
			{
				action: "Transfer",
				blockNumber: 89,
				from: ADDRESS_A,
				functionSig: Buffer.from("a9059cbb", "hex"),
				index: 1,
				timestamp: 1_719_999_000,
				to: ADDRESS_B,
				tokenAddress: TOKEN_ADDRESS,
				tokenDecimals: 6,
				tokenName: "Test Token",
				tokenSymbol: "TEST",
				transactionHash: "b".repeat(64),
				transactionIndex: 1,
				value: "100",
			},
		];
		repos.dataSource.data.rawOne = { count: "2" };

		const response = await server.inject({
			method: "GET",
			url: `/api/wallets/activity?addresses=${ADDRESS_A}`,
		});

		assert.is(response.statusCode, 200);

		const body = JSON.parse(response.payload);
		assert.is(body.meta.totalCount, 2);

		const [plain, tokenAction] = body.data;
		assert.equal(plain.functionSig, "0x6dd7d8ea");
		assert.undefined(plain.token);
		assert.equal(tokenAction.action, "Transfer");
		assert.equal(tokenAction.actionIndex, 1);
		assert.equal(tokenAction.token, {
			address: TOKEN_ADDRESS,
			decimals: 6,
			name: "Test Token",
			symbol: "TEST",
		});
	});

	it("GET /api/wallets/activity - requires an address list", async ({ server }) => {
		const response = await server.inject({ method: "GET", url: "/api/wallets/activity" });

		assert.is(response.statusCode, 422);
	});

	it("activity - returns an empty page for an empty address list", async ({ app, repos }) => {
		// The route schema requires addresses, so the defensive branch is only
		// reachable through a direct call.
		const { WalletsController } = await import("../controllers/wallets.js");
		const controller = app.resolve(WalletsController);

		const result = await controller.activity({ query: { addresses: [], limit: 100, page: 1 } } as any);

		assert.equal(result, { meta: { totalCountIsEstimate: false }, results: [], totalCount: 0 });
		// The early return skips the query building entirely: the transaction repository
		// query builder (the first thing the full path touches) is never used.
		assert.undefined(repos.transaction.qb.calls.leftJoin);
	});
});
