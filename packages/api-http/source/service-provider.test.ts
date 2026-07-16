import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { execSync } from "child_process";
import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

import { makeBlock } from "../test/fixtures/entities";
import { bootstrapServer, makeConfiguration, makeRepos, Repos } from "../test/helpers/server";
import { Identifiers as ApiHttpIdentifiers } from "./identifiers";
import { Server } from "./server";
import { ServiceProvider } from "./service-provider";

describe<{
	repos: Repos;
}>("ServiceProvider", ({ it, assert, beforeEach }) => {
	beforeEach((context) => {
		context.repos = makeRepos();
	});

	it("register: binds the http server; boot and dispose start and stop it", async ({ repos }) => {
		const { app, server, serviceProvider } = await bootstrapServer(repos);

		try {
			assert.true(app.isBound(ApiHttpIdentifiers.HTTP));
			assert.false(app.isBound(ApiHttpIdentifiers.HTTPS));
			assert.is(server.prettyName, "Public API (HTTP)");

			await serviceProvider.boot();
			assert.string(server.uri);
		} finally {
			await serviceProvider.dispose();
		}
	});

	it("register: responds to requests through the full plugin stack", async ({ repos }) => {
		const { server, serviceProvider } = await bootstrapServer(repos);

		try {
			const response = await server.inject({ method: "GET", url: "/" });

			assert.is(response.statusCode, 200);
			assert.equal(JSON.parse(response.payload), { data: "Hello World from Public API!" });
		} finally {
			await serviceProvider.dispose();
		}
	});

	it("register: rate limits requests when the rate limiter is enabled", async ({ repos }) => {
		repos.block.data.one = makeBlock();

		const limited = makeConfiguration();
		limited.plugins.rateLimit.enabled = true;
		limited.plugins.rateLimit.points = 1;

		const { server, serviceProvider } = await bootstrapServer(repos, limited);

		try {
			assert.is((await server.inject({ method: "GET", url: "/api/blockchain" })).statusCode, 200);
			assert.is((await server.inject({ method: "GET", url: "/api/blockchain" })).statusCode, 429);
		} finally {
			await serviceProvider.dispose();
		}
	});

	it("register: builds the https server when enabled", async ({ repos }) => {
		const directory = mkdtempSync(join(tmpdir(), "api-http-tls-"));
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

		const { app, serviceProvider } = await bootstrapServer(repos, https);

		try {
			await serviceProvider.boot();

			const server = app.get<Server>(ApiHttpIdentifiers.HTTPS);
			assert.is(server.prettyName, "Public API (HTTPS)");
			assert.startsWith(server.uri, "https://");

			const response = await server.inject({ method: "GET", url: "/api/blockchain" });
			assert.is(response.statusCode, 200);
		} finally {
			await serviceProvider.dispose();
		}
	});

	it("register: skips both servers when disabled", async ({ repos }) => {
		const disabled = makeConfiguration();
		disabled.server.http.enabled = false;

		const { app, serviceProvider } = await bootstrapServer(repos, disabled);

		await serviceProvider.boot();
		await serviceProvider.dispose();

		assert.false(app.isBound(ApiHttpIdentifiers.HTTP));
		assert.false(app.isBound(ApiHttpIdentifiers.HTTPS));
	});

	// The test configuration listens on port 0 to grab a free port; the schema
	// itself requires real port numbers.
	const makeValidatableConfiguration = () => {
		const config = makeConfiguration();
		config.server.http.port = 4003;
		config.server.https.port = 8443;
		return config;
	};

	it("configSchema: accepts a valid configuration", () => {
		const schema = new Application().resolve(ServiceProvider).configSchema();

		const result = schema.validate(makeValidatableConfiguration());

		assert.undefined(result.error);
		assert.equal(result.value.plugins.pagination.limit, 100);
		assert.equal(result.value.tokens.defaultMinimumBalance, 0.01);
	});

	it("configSchema: rejects invalid configurations", () => {
		const schema = new Application().resolve(ServiceProvider).configSchema();

		for (const mutate of [
			(config: any) => delete config.options,
			(config: any) => delete config.plugins.cache,
			(config: any) => delete config.plugins.rateLimit,
			(config: any) => delete config.tokens,
			(config: any) => (config.plugins.pagination.limit = -1),
			(config: any) => (config.plugins.rateLimit.points = "nope"),
			(config: any) => (config.tokens.defaultMinimumBalance = -1),
			(config: any) => (config.server.http.port = 0),
		]) {
			const config = makeValidatableConfiguration();
			mutate(config);

			assert.defined(schema.validate(config).error);
		}
	});
});
