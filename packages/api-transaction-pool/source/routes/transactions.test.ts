import { describe } from "@mainsail/test-runner";

import { makeTransaction } from "../../test/fixtures/transactions";
import { bootstrapServer, makeConfiguration } from "../../test/helpers/server";
import { Server } from "../server";
import { ServiceProvider } from "../service-provider";

describe<{
	server: Server;
	serviceProvider: ServiceProvider;
	processor: { process: (data: Buffer[]) => Promise<object> };
	transactions: ReturnType<typeof makeTransaction>[];
}>("Transactions routes", ({ it, assert, beforeEach, afterEach, stub }) => {
	beforeEach(async (context) => {
		context.transactions = [makeTransaction(1), makeTransaction(2)];

		context.processor = {
			process: async () => ({
				accept: ["0"],
				broadcast: ["0"],
				errors: undefined,
				excess: [],
				invalid: [],
			}),
		};

		const { server, serviceProvider } = await bootstrapServer(context);
		context.server = server;
		context.serviceProvider = serviceProvider;
	});

	afterEach(async ({ serviceProvider }) => {
		await serviceProvider.dispose();
	});

	it("POST /api/transactions - passes decoded buffers to the processor and returns its result", async ({
		server,
		processor,
	}) => {
		const process = stub(processor, "process").resolvedValue({
			accept: ["0"],
			broadcast: ["0"],
			errors: { "1": { message: "already in pool", type: "ERR_DUPLICATE" } },
			excess: [],
			invalid: ["1"],
		});

		const response = await server.inject({
			method: "POST",
			payload: { transactions: ["deadbeef", "c0ffee"] },
			url: "/api/transactions",
		});

		assert.is(response.statusCode, 200);
		assert.equal(JSON.parse(response.payload), {
			data: { accept: ["0"], broadcast: ["0"], excess: [], invalid: ["1"] },
			errors: { "1": { message: "already in pool", type: "ERR_DUPLICATE" } },
		});

		process.calledOnce();
		const buffers = process.getCallArgs(0)[0] as Buffer[];
		assert.equal(
			buffers.map((buffer) => buffer.toString("hex")),
			["deadbeef", "c0ffee"],
		);
	});

	it("POST /api/transactions - omits the errors key when the processor reports none", async ({ server }) => {
		const response = await server.inject({
			method: "POST",
			payload: { transactions: ["deadbeef"] },
			url: "/api/transactions",
		});

		assert.is(response.statusCode, 200);

		const body = JSON.parse(response.payload);
		assert.equal(body, { data: { accept: ["0"], broadcast: ["0"], excess: [], invalid: [] } });
		assert.false("errors" in body);
	});

	it("POST /api/transactions - rejects a payload without transactions", async ({ server }) => {
		const response = await server.inject({ method: "POST", payload: {}, url: "/api/transactions" });

		assert.is(response.statusCode, 422);
		assert.true(JSON.parse(response.payload).message.includes('"transactions" is required'));
	});

	it("POST /api/transactions - rejects an empty transactions array", async ({ server }) => {
		const response = await server.inject({
			method: "POST",
			payload: { transactions: [] },
			url: "/api/transactions",
		});

		assert.is(response.statusCode, 422);
	});

	it("POST /api/transactions - rejects more transactions than allowed per request", async ({ server }) => {
		const response = await server.inject({
			method: "POST",
			payload: { transactions: ["aa", "bb", "cc"] },
			url: "/api/transactions",
		});

		assert.is(response.statusCode, 422);
	});

	it("POST /api/transactions - rejects transactions that are not hex", async ({ server }) => {
		const response = await server.inject({
			method: "POST",
			payload: { transactions: ["not-hex!"] },
			url: "/api/transactions",
		});

		assert.is(response.statusCode, 422);
	});

	it("POST /api/transactions - rejects a malformed json body", async ({ server }) => {
		const response = await server.inject({
			headers: { "content-type": "application/json" },
			method: "POST",
			payload: "{not-json",
			url: "/api/transactions",
		});

		assert.is(response.statusCode, 422);
	});

	it("POST /api/transactions - rejects a transaction above the byte limit", async ({ server }) => {
		// maxTransactionBytes is 1024, so a transaction may be at most 2048 hex characters.
		const response = await server.inject({
			method: "POST",
			payload: { transactions: ["aa".repeat(1025)] },
			url: "/api/transactions",
		});

		assert.is(response.statusCode, 422);
	});

	it("POST /api/transactions - rejects a payload above the size limit", async ({ server }) => {
		// The payload cap is 100 + maxTransactionsPerRequest * (maxTransactionBytes * 2 + 4) = 4204
		// bytes, enforced while reading the body, before any schema validation runs.
		const response = await server.inject({
			method: "POST",
			payload: { transactions: ["aa".repeat(2100)] },
			url: "/api/transactions",
		});

		assert.is(response.statusCode, 422);
	});

	it("GET /api/transactions/unconfirmed - returns json-safe transactions in a pagination envelope", async ({
		server,
		transactions,
	}) => {
		const response = await server.inject({ method: "GET", url: "/api/transactions/unconfirmed" });

		assert.is(response.statusCode, 200);

		const body = JSON.parse(response.payload);
		assert.is(body.meta.totalCount, 2);
		assert.is(body.meta.count, 2);
		assert.length(body.data, 2);

		assert.equal(body.data[0].hash, transactions[0].hash);
		assert.equal(body.data[0].value, "100000");
		assert.equal(body.data[0].nonce, "1");
		assert.false("serialized" in body.data[0]);
	});

	it("GET /api/transactions/unconfirmed - returns an empty page when the pool is empty", async ({
		server,
		transactions,
	}) => {
		transactions.splice(0);

		const response = await server.inject({ method: "GET", url: "/api/transactions/unconfirmed" });

		assert.is(response.statusCode, 200);

		const body = JSON.parse(response.payload);
		assert.is(body.meta.totalCount, 0);
		assert.equal(body.data, []);
	});

	it("GET /api/transactions/unconfirmed - paginates with limit and page", async ({ server, transactions }) => {
		const response = await server.inject({
			method: "GET",
			url: "/api/transactions/unconfirmed?limit=1&page=2",
		});

		assert.is(response.statusCode, 200);

		const body = JSON.parse(response.payload);
		assert.is(body.meta.totalCount, 2);
		assert.is(body.meta.pageCount, 2);
		assert.length(body.data, 1);
		assert.equal(body.data[0].hash, transactions[1].hash);
	});

	it("GET /api/transactions/unconfirmed - rejects a limit above the configured maximum", async ({ server }) => {
		const response = await server.inject({
			method: "GET",
			url: "/api/transactions/unconfirmed?limit=101",
		});

		assert.is(response.statusCode, 422);
	});

	it("GET /api/transactions/unconfirmed - filters by from, to and address", async ({ server, transactions }) => {
		const [first, second] = transactions;

		let body = JSON.parse(
			(await server.inject({ method: "GET", url: `/api/transactions/unconfirmed?from=${first.from}` })).payload,
		);
		assert.length(body.data, 1);
		assert.equal(body.data[0].hash, first.hash);

		body = JSON.parse(
			(await server.inject({ method: "GET", url: `/api/transactions/unconfirmed?to=${second.to}` })).payload,
		);
		assert.length(body.data, 1);
		assert.equal(body.data[0].hash, second.hash);

		body = JSON.parse(
			(await server.inject({ method: "GET", url: `/api/transactions/unconfirmed?address=${first.from}` }))
				.payload,
		);
		assert.length(body.data, 1);
		assert.equal(body.data[0].hash, first.hash);

		body = JSON.parse(
			(await server.inject({ method: "GET", url: `/api/transactions/unconfirmed?address=${second.to}` })).payload,
		);
		assert.length(body.data, 1);
		assert.equal(body.data[0].hash, second.hash);
	});

	it("GET /api/transactions/unconfirmed - matches checksummed addresses case-insensitively", async ({
		server,
		transactions,
	}) => {
		const checksummed = "0xAbCdEf1234567890aBcDeF1234567890AbCdEf12";
		transactions.splice(0, transactions.length, { ...makeTransaction(1), from: checksummed } as any);

		const response = await server.inject({
			method: "GET",
			url: `/api/transactions/unconfirmed?from=${checksummed.toLowerCase()}`,
		});

		assert.is(response.statusCode, 200);
		assert.length(JSON.parse(response.payload).data, 1);
	});

	it("GET /api/transactions/unconfirmed - keeps the default limit within a lower configured maximum", async ({
		processor,
	}) => {
		// More transactions than the configured maximum, so the response size proves which
		// default was applied (50 from the schema default vs the controller's 100 fallback).
		const transactions = Array.from({ length: 60 }, (_, index) => makeTransaction(index + 1));

		const limited = makeConfiguration();
		limited.plugins.pagination.limit = 50;

		const { server, serviceProvider } = await bootstrapServer({ processor, transactions }, limited);

		try {
			const bare = await server.inject({ method: "GET", url: "/api/transactions/unconfirmed" });
			assert.is(bare.statusCode, 200);

			const body = JSON.parse(bare.payload);
			assert.is(body.meta.totalCount, 60);
			assert.length(body.data, 50);

			const aboveMaximum = await server.inject({
				method: "GET",
				url: "/api/transactions/unconfirmed?limit=60",
			});
			assert.is(aboveMaximum.statusCode, 422);
		} finally {
			await serviceProvider.dispose();
		}
	});

	it("GET /api/transactions/unconfirmed - accepts comma separated address lists", async ({
		server,
		transactions,
	}) => {
		const [first, second] = transactions;

		const response = await server.inject({
			method: "GET",
			url: `/api/transactions/unconfirmed?from=${first.from},${second.from}`,
		});

		assert.is(response.statusCode, 200);
		assert.length(JSON.parse(response.payload).data, 2);
	});

	it("GET /api/transactions/unconfirmed/{hash} - returns a single json-safe transaction", async ({
		server,
		transactions,
	}) => {
		const response = await server.inject({
			method: "GET",
			url: `/api/transactions/unconfirmed/${transactions[0].hash}`,
		});

		assert.is(response.statusCode, 200);

		const body = JSON.parse(response.payload);
		assert.equal(body.data.hash, transactions[0].hash);
		assert.equal(body.data.value, "100000");
		assert.false("serialized" in body.data);
	});

	it("GET /api/transactions/unconfirmed/{hash} - returns 404 for an unknown hash", async ({ server }) => {
		const response = await server.inject({
			method: "GET",
			url: `/api/transactions/unconfirmed/${"f".repeat(64)}`,
		});

		assert.is(response.statusCode, 404);
	});

	it("GET /api/transactions/unconfirmed/{hash} - rejects a malformed hash", async ({ server }) => {
		const response = await server.inject({ method: "GET", url: "/api/transactions/unconfirmed/nope" });

		assert.is(response.statusCode, 422);
	});

	it("GET /api/transactions/unconfirmed/{hash} - matches the hash case-insensitively", async ({
		server,
		transactions,
	}) => {
		// 0xab yields a hash containing letters, so the uppercase lookup actually differs.
		transactions.splice(0, transactions.length, makeTransaction(0xab));

		const response = await server.inject({
			method: "GET",
			url: `/api/transactions/unconfirmed/${"ab".repeat(32).toUpperCase()}`,
		});

		assert.is(response.statusCode, 200);
		assert.equal(JSON.parse(response.payload).data.hash, "ab".repeat(32));
	});
});
