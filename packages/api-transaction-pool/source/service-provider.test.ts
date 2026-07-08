import { Identifiers } from "@mainsail/constants";
import { Application, Providers } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { makeTransaction } from "../test/fixtures/transactions";
import { bindDependencies, bootstrapServer, makeConfiguration, registerServiceProvider } from "../test/helpers/server";
import { Server } from "./server";
import { ServiceProvider } from "./service-provider";

describe<{
	app: Application;
	serviceProvider: ServiceProvider;
	server: Server;
	processor: { process: (data: Buffer[]) => Promise<object> };
	transactions: ReturnType<typeof makeTransaction>[];
}>("ServiceProvider", ({ it, assert, beforeEach, afterEach }) => {
	beforeEach(async (context) => {
		context.transactions = [makeTransaction(1), makeTransaction(2)];
		context.processor = { process: async () => ({}) };

		context.app = new Application();
		bindDependencies(context.app, context);

		context.serviceProvider = await registerServiceProvider(context.app, makeConfiguration());

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

		const valid = makeConfiguration();
		valid.server.http.port = 4007;
		valid.server.https.port = 8447;
		assert.undefined(schema.validate(valid).error);

		const missingRateLimit: any = makeConfiguration();
		missingRateLimit.server.http.port = 4007;
		missingRateLimit.server.https.port = 8447;
		delete missingRateLimit.plugins.rateLimit;
		assert.defined(schema.validate(missingRateLimit).error);

		const missingPagination: any = makeConfiguration();
		missingPagination.server.http.port = 4007;
		missingPagination.server.https.port = 8447;
		delete missingPagination.plugins.pagination;
		assert.defined(schema.validate(missingPagination).error);
	});

	it("GET / - responds with the server name", async ({ server }) => {
		const response = await server.inject({ method: "GET", url: "/" });

		assert.is(response.statusCode, 200);
		assert.equal(JSON.parse(response.payload), { data: "Hello World from Transaction Pool API!" });
	});

	it("#register - rate limits requests when the rate limiter is enabled", async ({ processor, transactions }) => {
		const limited = makeConfiguration();
		limited.plugins.rateLimit.enabled = true;
		limited.plugins.rateLimit.points = 1;

		const { server, serviceProvider } = await bootstrapServer({ processor, transactions }, limited);

		try {
			assert.is((await server.inject({ method: "GET", url: "/api/configuration" })).statusCode, 200);
			assert.is((await server.inject({ method: "GET", url: "/api/configuration" })).statusCode, 429);
		} finally {
			await serviceProvider.dispose();
		}
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

		const https = makeConfiguration();
		https.server.http.enabled = false;
		https.server.https.enabled = true;
		https.server.https.tls = { cert: certPath, key: keyPath };

		const serviceProvider = app.resolve(ServiceProvider);
		serviceProvider.setConfig(app.resolve(Providers.PluginConfiguration).from("api-transaction-pool", https));

		try {
			await serviceProvider.register();
			await serviceProvider.boot();

			const server = app.get<Server>(Identifiers.TransactionPool.API.HTTPS);
			assert.is(server.prettyName, "Transaction Pool API (HTTPS)");
			assert.startsWith(server.uri, "https://");

			const response = await server.inject({ method: "GET", url: "/api/configuration" });
			assert.is(response.statusCode, 200);
		} finally {
			await serviceProvider.dispose();
		}
	});

	it("#register - skips both servers when disabled", async () => {
		const app = new Application();
		app.bind(Identifiers.Services.Log.Service).toConstantValue({ error: () => {}, info: () => {}, warn: () => {} });
		app.bind(Identifiers.Cryptography.Validator).toConstantValue({ addSchema: () => {}, hasSchema: () => true });

		const disabled = makeConfiguration();
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
