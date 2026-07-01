import { Enums, Identifiers } from "@mainsail/constants";
import { injectable } from "@mainsail/container";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { mkdtempSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

import { AbstractServer } from "./server";
import { Processor } from "./rcp/index.js";

@injectable()
class TestServer extends AbstractServer {
	protected baseName(): string {
		return "Test";
	}

	protected pluginConfiguration(): any {
		return {
			getRequired: (key: string) => {
				if (key === "plugins.socketTimeout") {
					return 5000;
				}
				return undefined;
			},
		};
	}

	protected defaultOptions(): Record<string, unknown> {
		return {};
	}
}

describe<{
	app: Application;
	subject: TestServer;
	logger: any;
}>("AbstractServer", ({ it, beforeEach, assert, spy, stub }) => {
	beforeEach((context) => {
		context.logger = {
			error: () => {},
			info: () => {},
			warn: () => {},
		};

		context.app = new Application();
		context.app.bind(Identifiers.Services.Log.Service).toConstantValue(context.logger);
		context.app.bind(Identifiers.Cryptography.Validator).toConstantValue({
			addSchema: () => {},
			validate: () => ({ error: undefined }),
		});

		context.subject = context.app.resolve(TestServer);
	});

	it("initialize - sets timeouts, app refs, root route and pretty name", async ({ subject }) => {
		await subject.initialize(Enums.Api.ServerType.Http, {});

		assert.is(subject.prettyName, "Test (HTTP)");

		const response = await subject.inject({ method: "GET", url: "/" });
		assert.equal(JSON.parse(response.payload), { data: "Hello World from Test!" });
		assert.is(response.statusCode, 200);
	});

	it("initialize - getRPCProcessor returns a Processor instance", async ({ subject }) => {
		await subject.initialize(Enums.Api.ServerType.Http, {});

		assert.instance(subject.getRPCProcessor(), Processor);
	});

	it("uri - is defined after boot", async ({ subject }) => {
		await subject.initialize(Enums.Api.ServerType.Http, { host: "127.0.0.1", port: 0 });
		await subject.boot();

		assert.string(subject.uri);
		assert.startsWith(subject.uri, "http://");

		await subject.dispose();
	});

	it("onPreHandler - sets content-type to application/json without erroring", async ({ subject }) => {
		await subject.initialize(Enums.Api.ServerType.Http, {});

		await subject.route({
			handler(request: any) {
				return { contentType: request.headers["content-type"] };
			},
			method: "GET",
			path: "/content-type",
		});

		const response = await subject.inject({ method: "GET", url: "/content-type" });
		assert.is(response.statusCode, 200);
		assert.equal(JSON.parse(response.payload), { contentType: "application/json" });
	});

	it("onPreResponse - logs error for generic server error", async ({ subject, logger }) => {
		await subject.initialize(Enums.Api.ServerType.Http, {});

		await subject.route({
			handler() {
				throw new Error("boom");
			},
			method: "GET",
			path: "/server-error",
		});

		const error = spy(logger, "error");

		const response = await subject.inject({ method: "GET", url: "/server-error" });
		assert.is(response.statusCode, 500);
		error.calledOnce();
	});

	it("onPreResponse - converts QueryFailedError to badRequest and logs warn", async ({ subject, logger }) => {
		await subject.initialize(Enums.Api.ServerType.Http, {});

		await subject.route({
			handler() {
				const error = new Error("query failed");
				error.name = "QueryFailedError";
				throw error;
			},
			method: "GET",
			path: "/query-failed",
		});

		const warn = spy(logger, "warn");

		const response = await subject.inject({ method: "GET", url: "/query-failed" });
		assert.is(response.statusCode, 400);
		warn.calledOnce();
	});

	it("onPreResponse - passes through a normal 200 response", async ({ subject, logger }) => {
		await subject.initialize(Enums.Api.ServerType.Http, {});

		const error = spy(logger, "error");
		const warn = spy(logger, "warn");

		const response = await subject.inject({ method: "GET", url: "/" });
		assert.is(response.statusCode, 200);
		error.neverCalled();
		warn.neverCalled();
	});

	it("boot - success logs info and dispose stops and logs info", async ({ subject, logger }) => {
		await subject.initialize(Enums.Api.ServerType.Http, { host: "127.0.0.1", port: 0 });

		const info = spy(logger, "info");

		await subject.boot();
		info.calledOnce();
		assert.true(info.getCallArgs(0)[0].includes("Server started"));

		await subject.dispose();
		info.calledTimes(2);
		assert.true(info.getCallArgs(1)[0].includes("Server stopped"));
	});

	it("boot - failure path terminates the application", async ({ subject, app }) => {
		await subject.initialize(Enums.Api.ServerType.Http, { host: "127.0.0.1", port: 0 });

		const terminate = stub(app, "terminate").resolvedValue(undefined);
		// Force start to fail
		const internalServer = (subject as any)["server"];
		stub(internalServer, "start").rejectedValue(new Error("start failed"));

		await subject.boot();

		terminate.calledOnce();
	});

	it("dispose - failure path terminates the application", async ({ subject, app }) => {
		await subject.initialize(Enums.Api.ServerType.Http, { host: "127.0.0.1", port: 0 });

		const terminate = stub(app, "terminate").resolvedValue(undefined);
		const internalServer = (subject as any)["server"];
		stub(internalServer, "stop").rejectedValue(new Error("stop failed"));

		await subject.dispose();

		terminate.calledOnce();
	});

	it("registerPlugins - registers a plugin", async ({ subject }) => {
		await subject.initialize(Enums.Api.ServerType.Http, {});

		let registered = false;
		await subject.registerPlugins([
			{
				name: "test-plugin",
				register: () => {
					registered = true;
				},
				version: "1.0.0",
			},
		]);

		assert.true(registered);
	});

	it("registerHandlers - registers a handler plugin", async ({ subject }) => {
		await subject.initialize(Enums.Api.ServerType.Http, {});

		let registered = false;
		await subject.registerHandlers({
			plugin: {
				name: "handler-plugin",
				register: () => {
					registered = true;
				},
				version: "1.0.0",
			},
		});

		assert.true(registered);
	});

	it("route + getRoute - finds a registered route and returns undefined otherwise", async ({ subject }) => {
		await subject.initialize(Enums.Api.ServerType.Http, {});

		await subject.route({
			handler() {
				return "ok";
			},
			method: "GET",
			path: "/foo",
		});

		const found = subject.getRoute("GET", "/foo");
		assert.defined(found);
		assert.is(found!.path, "/foo");

		assert.undefined(subject.getRoute("GET", "/does-not-exist"));
	});

	it("inject - works against the root route", async ({ subject }) => {
		await subject.initialize(Enums.Api.ServerType.Http, {});

		const response = await subject.inject({ method: "GET", url: "/" });
		assert.is(response.statusCode, 200);
	});

	it("getServerOptions - reads tls key/cert from files when tls provided", async ({ subject }) => {
		const dir = mkdtempSync(join(tmpdir(), "api-common-tls-"));
		const keyPath = join(dir, "key.pem");
		const certPath = join(dir, "cert.pem");

		// Generate a real self-signed key/cert so Hapi can create the TLS listener.
		const { execSync } = await import("child_process");
		execSync(
			`openssl req -x509 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPath}" -days 1 -nodes -subj "/CN=localhost"`,
			{ stdio: "ignore" },
		);

		await subject.initialize(Enums.Api.ServerType.Https, {
			host: "127.0.0.1",
			port: 0,
			tls: { cert: certPath, key: keyPath },
		});

		assert.is(subject.prettyName, "Test (HTTPS)");

		const response = await subject.inject({ method: "GET", url: "/" });
		assert.is(response.statusCode, 200);
	});
});
