import { describe } from "@mainsail/test-runner";

import {
	ADDRESS_A,
	ADDRESS_B,
	makePage,
	makeTransaction,
	PUBLIC_KEY,
	TRANSACTION_HASH,
} from "../../test/fixtures/entities";
import { bootstrapServer, makeRepos, Repos } from "../../test/helpers/server";
import { Server } from "../server";
import { ServiceProvider } from "../service-provider";

// A transaction row as production returns it for receipts: options.selection limits
// the loaded columns, so anything outside #getReceiptColumns is absent from the entity.
const makeSelectedReceiptRow = (overrides: Record<string, unknown> = {}) => {
	const { decodedError, deployedContractAddress, gasRefunded, gasUsed, hash, logs, output, status } =
		makeTransaction(overrides);

	return { decodedError, deployedContractAddress, gasRefunded, gasUsed, hash, logs, output, status };
};

describe<{
	server: Server;
	serviceProvider: ServiceProvider;
	repos: Repos;
}>("Receipts routes", ({ it, assert, beforeEach, afterEach }) => {
	beforeEach(async (context) => {
		context.repos = makeRepos();

		const { server, serviceProvider } = await bootstrapServer(context.repos);
		context.server = server;
		context.serviceProvider = serviceProvider;
	});

	afterEach(async ({ serviceProvider }) => {
		await serviceProvider.dispose();
	});

	it("GET /api/receipts - maps transactions to receipts", async ({ server, repos }) => {
		repos.transaction.data.page = makePage([makeTransaction({ decodedError: "reverted", status: 0 })]);

		const response = await server.inject({ method: "GET", url: "/api/receipts" });

		assert.is(response.statusCode, 200);

		const body = JSON.parse(response.payload);
		assert.is(body.meta.totalCount, 1);
		assert.equal(body.data[0], {
			blockNumber: "90",
			cumulativeGasUsed: 21_000,
			decodedError: "reverted",
			gasRefunded: 0,
			gasUsed: 21_000,
			logs: [],
			output: "0x",
			status: 0,
			transactionHash: TRANSACTION_HASH,
		});
	});

	it("GET /api/receipts - forwards the hardcoded ordering and the receipt column selection", async ({
		server,
		repos,
	}) => {
		// Note: the route schema does not even accept an orderBy parameter.
		await server.inject({ method: "GET", url: "/api/receipts" });

		// The controller hardcodes the listing order.
		const [, , sorting, , options] = repos.transaction.calls.findManyByCriteria[0];
		assert.equal(sorting, [
			{ direction: "desc", property: "timestamp" },
			{ direction: "desc", property: "transactionIndex" },
		]);
		// fullReceipt defaults to true on this route, so output and logs are selected.
		assert.equal(options.selection, [
			"Transaction.hash",
			"Transaction.status",
			"Transaction.gasUsed",
			"Transaction.gasRefunded",
			"Transaction.deployedContractAddress",
			"Transaction.decodedError",
			"Transaction.output",
			"Transaction.logs",
		]);
	});

	it("GET /api/receipts - scopes the criteria to hash and contract", async ({ server, repos }) => {
		await server.inject({
			method: "GET",
			url: `/api/receipts?transactionHash=${TRANSACTION_HASH}&to=${ADDRESS_B}`,
		});

		const [, criteria] = repos.transaction.calls.findManyByCriteria[0];
		assert.equal(criteria, { hash: TRANSACTION_HASH, to: ADDRESS_B });
	});

	it("GET /api/receipts - treats a 0x-prefixed sender as an address", async ({ server, repos }) => {
		await server.inject({ method: "GET", url: `/api/receipts?from=${ADDRESS_A}` });

		const [, criteria] = repos.transaction.calls.findManyByCriteria[0];
		assert.equal(criteria.from, ADDRESS_A);
		assert.undefined(criteria.senderPublicKey);
	});

	it("GET /api/receipts - treats any other sender as a public key", async ({ server, repos }) => {
		await server.inject({ method: "GET", url: `/api/receipts?from=${PUBLIC_KEY}` });

		const [, criteria] = repos.transaction.calls.findManyByCriteria[0];
		assert.equal(criteria.senderPublicKey, PUBLIC_KEY);
		assert.undefined(criteria.from);
	});

	it("GET /api/receipts - treats a 0x-prefixed sender that is not 42 characters long as a public key", async ({
		server,
		repos,
	}) => {
		await server.inject({ method: "GET", url: "/api/receipts?from=0xabc" });

		const [, criteria] = repos.transaction.calls.findManyByCriteria[0];
		assert.equal(criteria.senderPublicKey, "0xabc");
		assert.undefined(criteria.from);
	});

	it("GET /api/receipts/{transactionHash} - selects the full receipt columns by default", async ({
		server,
		repos,
	}) => {
		repos.transaction.data.one = makeTransaction();

		const response = await server.inject({ method: "GET", url: `/api/receipts/${TRANSACTION_HASH}` });

		assert.is(response.statusCode, 200);
		assert.equal(JSON.parse(response.payload).data.transactionHash, TRANSACTION_HASH);

		const [columns] = repos.transaction.qb.calls.select.at(-1)!;
		assert.true(columns.includes("Transaction.output"));
		assert.true(columns.includes("Transaction.logs"));
	});

	it("GET /api/receipts/{transactionHash} - selects the compact column set when opting out", async ({
		server,
		repos,
	}) => {
		repos.transaction.data.one = makeTransaction();

		await server.inject({ method: "GET", url: `/api/receipts/${TRANSACTION_HASH}?fullReceipt=false` });

		const [columns] = repos.transaction.qb.calls.select.at(-1)!;
		assert.false(columns.includes("Transaction.output"));
		assert.false(columns.includes("Transaction.logs"));
	});

	it("GET /api/receipts/{transactionHash} - responds 404 for an unknown transaction", async ({ server }) => {
		const response = await server.inject({ method: "GET", url: `/api/receipts/${"f".repeat(64)}` });

		assert.is(response.statusCode, 404);
	});

	it("GET /api/receipts/contracts - restricts the criteria to deployments", async ({ server, repos }) => {
		repos.transaction.data.page = makePage([
			makeTransaction({ deployedContractAddress: ADDRESS_B, to: undefined }),
		]);

		const response = await server.inject({ method: "GET", url: `/api/receipts/contracts?from=${ADDRESS_A}` });

		assert.is(response.statusCode, 200);
		assert.equal(JSON.parse(response.payload).data[0].contractAddress, ADDRESS_B);

		const [, criteria] = repos.transaction.calls.findManyByCriteria[0];
		assert.equal(criteria, { deployedContractAddress: true, from: ADDRESS_A });
	});
});
