import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { Application, Providers } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { makeQueryIterable, makeTransaction } from "../test/fixtures/transactions";
import { Server } from "./server";
import { ServiceProvider } from "./service-provider";

const configuration = {
	plugins: {
		pagination: { limit: 100 },
		rateLimit: { blacklist: [], duration: 60, enabled: false, points: 150, whitelist: [] },
		socketTimeout: 5000,
		trustProxy: false,
		whitelist: ["*"],
	},
	server: {
		http: { enabled: true, host: "127.0.0.1", port: 0 },
		https: { enabled: false, host: "127.0.0.1", port: 0, tls: {} },
	},
};

const poolConfiguration = {
	maxTransactionAge: 2700,
	maxTransactionBytes: 1024,
	maxTransactionsInPool: 15_000,
	maxTransactionsPerRequest: 2,
	maxTransactionsPerSender: 150,
};

const bindDependencies = (app: Application, context: { processor: object; transactions: unknown[] }): void => {
	app.bind(Identifiers.Services.Log.Service).toConstantValue({
		error: () => {},
		info: () => {},
		warn: () => {},
	});
	app.bind(Identifiers.Cryptography.Validator).toConstantValue({
		addSchema: () => {},
		hasSchema: () => false,
	});
	app.bind(Identifiers.Application.Version).toConstantValue("0.0.1-test");

	app.bind(Identifiers.ServiceProvider.Configuration)
		.toConstantValue({
			getRequired: (key: string) => poolConfiguration[key],
		})
		.whenTagged("plugin", "transaction-pool-service");

	app.bind(Identifiers.TransactionPool.Processor).toConstantValue(context.processor);
	app.bind(Identifiers.TransactionPool.Query).toConstantValue({
		getFromHighestPriority: () => makeQueryIterable(context.transactions),
	});
	app.bind(Identifiers.State.Store).toConstantValue({ getBlockNumber: () => 42 });
};

const registerServiceProvider = async (app: Application, config: object): Promise<ServiceProvider> => {
	const pluginConfiguration = app.resolve(Providers.PluginConfiguration).from("api-transaction-pool", config);
	app.bind(Identifiers.ServiceProvider.Configuration)
		.toConstantValue(pluginConfiguration)
		.whenTagged("plugin", "api-transaction-pool");

	const serviceProvider = app.resolve(ServiceProvider);
	serviceProvider.setConfig(pluginConfiguration);

	await serviceProvider.register();

	return serviceProvider;
};

describe<{
	app: Application;
	serviceProvider: ServiceProvider;
	server: Server;
	processor: { process: (data: Buffer[]) => Promise<object> };
	transactions: ReturnType<typeof makeTransaction>[];
}>("ServiceProvider", ({ it, assert, beforeEach, afterEach, stub }) => {
	const clone = (object: object) => JSON.parse(JSON.stringify(object));

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

		context.app = new Application();
		bindDependencies(context.app, context);

		context.serviceProvider = await registerServiceProvider(context.app, clone(configuration));

		context.server = context.app.get<Server>(Identifiers.TransactionPool.API.HTTP);
	});

	afterEach(async ({ serviceProvider }) => {
		await serviceProvider.dispose();
	});

	it("#register - binds the http server and boot/dispose start and stop it", async ({
		app,
		serviceProvider,
		server,
	}) => {
		assert.true(app.isBound(Identifiers.TransactionPool.API.HTTP));
		assert.false(app.isBound(Identifiers.TransactionPool.API.HTTPS));
		assert.is(server.prettyName, "Transaction Pool API (HTTP)");

		await serviceProvider.boot();
		assert.string(server.uri);
	});

	it("#configSchema - accepts the packaged defaults shape and rejects missing keys", async ({ serviceProvider }) => {
		const schema = serviceProvider.configSchema();

		const valid = clone(configuration);
		valid.server.http.port = 4007;
		valid.server.https.port = 8447;
		assert.undefined(schema.validate(valid).error);

		const missingRateLimit = clone(valid);
		delete missingRateLimit.plugins.rateLimit;
		assert.defined(schema.validate(missingRateLimit).error);

		const missingPagination = clone(valid);
		delete missingPagination.plugins.pagination;
		assert.defined(schema.validate(missingPagination).error);
	});

	it("GET / - responds with the server name", async ({ server }) => {
		const response = await server.inject({ method: "GET", url: "/" });

		assert.is(response.statusCode, 200);
		assert.equal(JSON.parse(response.payload), { data: "Hello World from Transaction Pool API!" });
	});

	it("GET /api/configuration - returns version, block number and pool configuration", async ({ server }) => {
		const response = await server.inject({ method: "GET", url: "/api/configuration" });

		assert.is(response.statusCode, 200);
		assert.equal(JSON.parse(response.payload), {
			data: {
				blockNumber: 42,
				core: { version: "0.0.1-test" },
				transactionPool: {
					maxTransactionAge: 2700,
					maxTransactionBytes: 1024,
					maxTransactionsInPool: 15_000,
					maxTransactionsPerRequest: 2,
					maxTransactionsPerSender: 150,
				},
			},
		});
	});

	it("GET /api/configuration/ - strips the trailing slash", async ({ server }) => {
		const response = await server.inject({ method: "GET", url: "/api/configuration/" });

		assert.is(response.statusCode, 200);
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

		const app = new Application();
		bindDependencies(app, { processor, transactions });

		const limited = clone(configuration);
		limited.plugins.pagination.limit = 50;

		const serviceProvider = await registerServiceProvider(app, limited);
		const server = app.get<Server>(Identifiers.TransactionPool.API.HTTP);

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

		await serviceProvider.dispose();
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

	it("#register - rate limits requests when the rate limiter is enabled", async ({ processor, transactions }) => {
		const app = new Application();
		bindDependencies(app, { processor, transactions });

		const limited = clone(configuration);
		limited.plugins.rateLimit.enabled = true;
		limited.plugins.rateLimit.points = 1;

		const serviceProvider = await registerServiceProvider(app, limited);
		const server = app.get<Server>(Identifiers.TransactionPool.API.HTTP);

		assert.is((await server.inject({ method: "GET", url: "/api/configuration" })).statusCode, 200);
		assert.is((await server.inject({ method: "GET", url: "/api/configuration" })).statusCode, 429);

		await serviceProvider.dispose();
	});

	it("#register - builds the https server when enabled", async ({ app }) => {
		const { execSync } = await import("child_process");
		const { mkdtempSync } = await import("fs");
		const { tmpdir } = await import("os");
		const { join } = await import("path");

		const directory = mkdtempSync(join(tmpdir(), "api-transaction-pool-tls-"));
		const keyPath = join(directory, "key.pem");
		const certPath = join(directory, "cert.pem");
		execSync(
			`openssl req -x509 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPath}" -days 1 -nodes -subj "/CN=localhost"`,
			{ stdio: "ignore" },
		);

		const https = clone(configuration);
		https.server.http.enabled = false;
		https.server.https.enabled = true;
		https.server.https.tls = { cert: certPath, key: keyPath };

		const serviceProvider = app.resolve(ServiceProvider);
		serviceProvider.setConfig(app.resolve(Providers.PluginConfiguration).from("api-transaction-pool", https));

		await serviceProvider.register();
		await serviceProvider.boot();

		const server = app.get<Server>(Identifiers.TransactionPool.API.HTTPS);
		assert.is(server.prettyName, "Transaction Pool API (HTTPS)");
		assert.startsWith(server.uri, "https://");

		const response = await server.inject({ method: "GET", url: "/api/configuration" });
		assert.is(response.statusCode, 200);

		await serviceProvider.dispose();
	});

	it("#register - skips both servers when disabled", async () => {
		const app = new Application();
		app.bind(Identifiers.Services.Log.Service).toConstantValue({ error: () => {}, info: () => {}, warn: () => {} });
		app.bind(Identifiers.Cryptography.Validator).toConstantValue({ addSchema: () => {}, hasSchema: () => true });

		const disabled = clone(configuration);
		disabled.server.http.enabled = false;

		const serviceProvider = app.resolve(ServiceProvider);
		serviceProvider.setConfig(app.resolve(Providers.PluginConfiguration).from("api-transaction-pool", disabled));

		await serviceProvider.register();
		await serviceProvider.boot();
		await serviceProvider.dispose();

		assert.false(app.isBound(Identifiers.TransactionPool.API.HTTP));
		assert.false(app.isBound(Identifiers.TransactionPool.API.HTTPS));
	});
});
