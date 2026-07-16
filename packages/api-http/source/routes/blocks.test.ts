import { describe } from "@mainsail/test-runner";

import {
	ADDRESS_A,
	BLOCK_HASH,
	makeBlock,
	makePage,
	makeState,
	makeTransaction,
	makeWallet,
	TRANSACTION_HASH,
} from "../../test/fixtures/entities";
import { bootstrapServer, makeRepos, Repos } from "../../test/helpers/server";
import { Server } from "../server";
import { ServiceProvider } from "../service-provider";

describe<{
	server: Server;
	serviceProvider: ServiceProvider;
	repos: Repos;
}>("Blocks routes", ({ it, assert, beforeEach, afterEach }) => {
	beforeEach(async (context) => {
		context.repos = makeRepos();

		const { server, serviceProvider } = await bootstrapServer(context.repos);
		context.server = server;
		context.serviceProvider = serviceProvider;
	});

	afterEach(async ({ serviceProvider }) => {
		await serviceProvider.dispose();
	});

	it("GET /api/blocks - returns enriched blocks in a pagination envelope", async ({ server, repos }) => {
		repos.block.data.page = makePage([makeBlock()]);
		repos.state.data.one = makeState({ blockNumber: "100" });
		repos.wallet.data.many = [makeWallet()];

		const response = await server.inject({ method: "GET", url: "/api/blocks" });

		assert.is(response.statusCode, 200);

		const body = JSON.parse(response.payload);
		assert.is(body.meta.totalCount, 1);
		assert.length(body.data, 1);

		const [block] = body.data;
		assert.equal(block.hash, BLOCK_HASH);
		assert.equal(block.number, 90);
		assert.equal(block.confirmations, 10);
		assert.equal(block.total, "300"); // reward 200 + fee 100
		assert.equal(block.proposer, ADDRESS_A);
		assert.equal(block.username, "genesis");
		assert.equal(block.publicKey, makeWallet().publicKey);
	});

	it("GET /api/blocks - skips the generator lookup for an empty page", async ({ server, repos }) => {
		const response = await server.inject({ method: "GET", url: "/api/blocks" });

		assert.is(response.statusCode, 200);
		assert.equal(JSON.parse(response.payload).data, []);
		// No blocks -> the wallet repository is never queried.
		assert.undefined(repos.wallet.qb.calls.getMany);
	});

	it("GET /api/blocks - rejects an unknown orderBy property", async ({ server }) => {
		const response = await server.inject({ method: "GET", url: "/api/blocks?orderBy=nope:desc" });

		assert.is(response.statusCode, 422);
	});

	it("GET /api/blocks - rejects a limit above the configured maximum", async ({ server }) => {
		const response = await server.inject({ method: "GET", url: "/api/blocks?limit=101" });

		assert.is(response.statusCode, 422);
	});

	it("GET /api/blocks/first - enriches the genesis block with defaults for unknown generators", async ({
		server,
		repos,
	}) => {
		repos.block.data.one = makeBlock({ number: "0" });
		// No wallet and no state row -> fall back to a zero state and an empty generator.

		const response = await server.inject({ method: "GET", url: "/api/blocks/first" });

		assert.is(response.statusCode, 200);

		const { data } = JSON.parse(response.payload);
		assert.equal(data.number, 0);
		assert.equal(data.confirmations, 0);
		assert.equal(data.publicKey, "");
		assert.undefined(data.username);
	});

	it("GET /api/blocks/last - enriches the block with its generator wallet", async ({ server, repos }) => {
		repos.block.data.one = makeBlock();
		repos.state.data.one = makeState();
		repos.wallet.data.one = makeWallet({ attributes: { username: "proposer" } });

		const response = await server.inject({ method: "GET", url: "/api/blocks/last" });

		assert.is(response.statusCode, 200);
		assert.equal(JSON.parse(response.payload).data.username, "proposer");
	});

	it("GET /api/blocks/last - responds 404 on an empty chain", async ({ server }) => {
		const response = await server.inject({ method: "GET", url: "/api/blocks/last" });

		assert.is(response.statusCode, 404);
	});

	it("GET /api/blocks/{id} - looks up small numeric ids as block numbers", async ({ server, repos }) => {
		repos.block.data.one = makeBlock();
		repos.state.data.one = makeState();

		const response = await server.inject({ method: "GET", url: "/api/blocks/90" });

		assert.is(response.statusCode, 200);
		assert.equal(repos.block.calls.findOneByCriteria[0][0], { number: 90 });
	});

	it("GET /api/blocks/{id} - looks up 64 character ids as block hashes", async ({ server, repos }) => {
		repos.block.data.one = makeBlock();
		repos.state.data.one = makeState();

		const response = await server.inject({ method: "GET", url: `/api/blocks/${BLOCK_HASH}` });

		assert.is(response.statusCode, 200);
		assert.equal(repos.block.calls.findOneByCriteria[0][0], { hash: BLOCK_HASH });
	});

	it("GET /api/blocks/{id} - rejects a malformed id", async ({ server }) => {
		const response = await server.inject({ method: "GET", url: "/api/blocks/not-a-block" });

		assert.is(response.statusCode, 422);
	});

	it("GET /api/blocks/{id} - responds 404 for an unknown block", async ({ server }) => {
		const response = await server.inject({ method: "GET", url: "/api/blocks/90" });

		assert.is(response.statusCode, 404);
	});

	it("GET /api/blocks/{id}/transactions - returns the enriched transactions of the block", async ({
		server,
		repos,
	}) => {
		repos.block.data.one = makeBlock();
		repos.state.data.one = makeState({ blockNumber: "100" });
		repos.transaction.data.page = makePage([makeTransaction()]);

		const response = await server.inject({ method: "GET", url: "/api/blocks/90/transactions" });

		assert.is(response.statusCode, 200);

		const body = JSON.parse(response.payload);
		assert.is(body.meta.totalCount, 1);

		const [transaction] = body.data;
		assert.equal(transaction.hash, TRANSACTION_HASH);
		assert.equal(transaction.confirmations, 11); // 100 - 90 + 1
		assert.equal(transaction.data, ""); // "0x" is normalized to an empty string
		assert.equal(transaction.receipt.gasUsed, 21_000);
		// Not requested -> the receipt omits logs and output.
		assert.false("logs" in transaction.receipt);

		// The criteria passed to the repository are scoped to the block.
		const [, criteria] = repos.transaction.calls.findManyByCriteria[0];
		assert.equal(criteria.blockHash, BLOCK_HASH);
	});

	it("GET /api/blocks/{id}/transactions - responds 404 for an unknown block", async ({ server }) => {
		const response = await server.inject({ method: "GET", url: "/api/blocks/90/transactions" });

		assert.is(response.statusCode, 404);
	});
});
