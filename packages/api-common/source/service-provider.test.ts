import type { Contracts } from "@mainsail/contracts";

import { NamedPlugin, Plugin } from "@hapi/hapi";
import { Identifiers } from "@mainsail/constants";
import { injectable } from "@mainsail/container";
import { Application, Providers } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { AbstractServer } from "./server";
import { AbstractServiceProvider, ServerConstructor } from "./service-provider";

// Config used to drive register/boot/dispose (port 0 -> OS-assigned; servers are never started here).
const validConfig = {
	plugins: {
		pagination: { limit: 100 },
		socketTimeout: 5000,
		trustProxy: false,
		whitelist: ["*"],
	},
	server: {
		http: { enabled: true, host: "0.0.0.0", port: 0 },
		https: {
			enabled: false,
			host: "0.0.0.0",
			port: 0,
			tls: {},
		},
	},
};

// Config used for configSchema() validation (ports must be >= 1 per the schema).
const schemaConfig = {
	plugins: {
		pagination: { limit: 100 },
		socketTimeout: 5000,
		trustProxy: false,
		whitelist: ["*"],
	},
	server: {
		http: { enabled: true, host: "0.0.0.0", port: 4003 },
		https: {
			enabled: false,
			host: "0.0.0.0",
			port: 8443,
			tls: {},
		},
	},
};

describe<{
	app: Application;
	serviceProvider: AbstractServiceProvider<AbstractServer>;
	validator: { hasSchema: () => boolean; addSchema: (schema: unknown) => void };
	httpId: symbol;
	httpsId: symbol;
	action: Contracts.Api.RPC.Action;
	setConfig: (config: any) => void;
}>("ServiceProvider", ({ it, assert, beforeEach, spy, stub, match }) => {
	beforeEach((context) => {
		context.httpId = Symbol("http");
		context.httpsId = Symbol("https");

		context.action = {
			handle() {
				return {};
			},
			name: "actX",
			schema: { $id: "actX" },
		} as unknown as Contracts.Api.RPC.Action;

		const httpId = context.httpId;
		const httpsId = context.httpsId;
		const action = context.action;

		// Minimal concrete AbstractServer subclass
		@injectable()
		class TestServer extends AbstractServer {
			protected baseName(): string {
				return "Test";
			}
			protected pluginConfiguration(): Contracts.Kernel.PluginConfiguration {
				return {
					getRequired: () => 5000,
				} as unknown as Contracts.Kernel.PluginConfiguration;
			}
			protected defaultOptions(): Record<string, unknown> {
				return {};
			}
		}

		// Minimal concrete AbstractServiceProvider subclass
		@injectable()
		class TestServiceProvider extends AbstractServiceProvider<AbstractServer> {
			protected httpIdentifier(): symbol {
				return httpId;
			}
			protected httpsIdentifier(): symbol {
				return httpsId;
			}
			protected getServerConstructor(): ServerConstructor<AbstractServer> {
				return TestServer as unknown as ServerConstructor<AbstractServer>;
			}
			protected getHandlers(): NamedPlugin<unknown> {
				return {
					name: "h",
					register(server: any) {
						server.route({
							handler: () => ({ data: "ok" }),
							method: "GET",
							path: "/ping",
						});
					},
					version: "1",
				};
			}
			protected getPlugins(): Plugin<unknown>[] {
				return [];
			}
			protected getActions(): Contracts.Api.RPC.Action[] {
				return [action];
			}
		}

		context.validator = { addSchema: () => {}, hasSchema: () => false };

		context.app = new Application();
		context.app.bind(Identifiers.Services.Log.Service).toConstantValue({
			error: () => {},
			info: () => {},
			warn: () => {},
		});
		context.app.bind(Identifiers.Cryptography.Validator).toConstantValue(context.validator);

		context.serviceProvider = context.app.resolve(TestServiceProvider);

		context.setConfig = (config: any) => {
			const pluginConfig = context.app.resolve(Providers.PluginConfiguration).from("api-common", config);
			context.serviceProvider.setConfig(pluginConfig);
		};
	});

	const clone = (obj: any) => JSON.parse(JSON.stringify(obj));

	it("#register - builds http server when http.enabled is true", async ({
		app,
		serviceProvider,
		validator,
		httpId,
		httpsId,
		setConfig,
	}) => {
		const addSchema = spy(validator, "addSchema");
		setConfig(clone(validConfig));

		await serviceProvider.register();

		assert.true(app.isBound(httpId));
		assert.false(app.isBound(httpsId));

		// The server was initialized (uri available after initialize)
		const server = app.get<AbstractServer>(httpId);
		assert.instance(server, AbstractServer);

		// #registerValidation registers the api-common schemas
		addSchema.called();
	});

	it("#register - builds https server when https.enabled is true", async ({
		app,
		serviceProvider,
		httpId,
		httpsId,
		setConfig,
	}) => {
		const config = clone(validConfig);
		config.server.http.enabled = false;
		config.server.https.enabled = true;
		setConfig(config);

		await serviceProvider.register();

		assert.false(app.isBound(httpId));
		assert.true(app.isBound(httpsId));
	});

	it("#register - builds no server when both disabled", async ({
		app,
		serviceProvider,
		httpId,
		httpsId,
		setConfig,
	}) => {
		const config = clone(validConfig);
		config.server.http.enabled = false;
		config.server.https.enabled = false;
		setConfig(config);

		await serviceProvider.register();

		assert.false(app.isBound(httpId));
		assert.false(app.isBound(httpsId));
	});

	it("#register - does not re-add validation schema when it already exists", async ({
		serviceProvider,
		validator,
		setConfig,
	}) => {
		validator.hasSchema = () => true;
		const addSchema = spy(validator, "addSchema");

		const config = clone(validConfig);
		config.server.http.enabled = false;
		config.server.https.enabled = false;
		setConfig(config);

		await serviceProvider.register();

		addSchema.neverCalled();
	});

	it("#buildServer - registers handlers and registered actions", async ({
		app,
		serviceProvider,
		validator,
		httpId,
		setConfig,
	}) => {
		const addSchema = spy(validator, "addSchema");
		setConfig(clone(validConfig));

		await serviceProvider.register();

		const server = app.get<AbstractServer>(httpId);

		// getActions() action was registered on the RPC processor
		const processor = server.getRPCProcessor();
		assert.defined(processor);

		// Handler route registered under /api prefix
		const route = server.getRoute("GET", "/api/ping");
		assert.defined(route);

		// registerAction stored the action and added its schema to the validator
		addSchema.calledWith(match.has("$id", "actX"));
	});

	it("#boot - calls boot on enabled servers only", async ({ app, serviceProvider, httpId, setConfig }) => {
		setConfig(clone(validConfig));

		await serviceProvider.register();

		const server = app.get<AbstractServer>(httpId);
		const bootSpy = stub(server, "boot").resolvedValue();

		await serviceProvider.boot();

		bootSpy.calledOnce();
	});

	it("#dispose - calls dispose on enabled servers only", async ({ app, serviceProvider, httpId, setConfig }) => {
		setConfig(clone(validConfig));

		await serviceProvider.register();

		const server = app.get<AbstractServer>(httpId);
		const disposeSpy = stub(server, "dispose").resolvedValue();

		await serviceProvider.dispose();

		disposeSpy.calledOnce();
	});

	it("#boot / #dispose - do nothing when servers disabled", async ({ serviceProvider, setConfig }) => {
		const config = clone(validConfig);
		config.server.http.enabled = false;
		config.server.https.enabled = false;
		setConfig(config);

		await assert.resolves(() => serviceProvider.boot());
		await assert.resolves(() => serviceProvider.dispose());
	});

	it("#boot / #dispose - operate on the https server when https enabled", async ({
		app,
		serviceProvider,
		httpsId,
		setConfig,
	}) => {
		const config = clone(validConfig);
		config.server.http.enabled = false;
		config.server.https.enabled = true;
		setConfig(config);

		await serviceProvider.register();

		const server = app.get<AbstractServer>(httpsId);
		const bootSpy = stub(server, "boot").resolvedValue();
		const disposeSpy = stub(server, "dispose").resolvedValue();

		await serviceProvider.boot();
		await serviceProvider.dispose();

		bootSpy.calledOnce();
		disposeSpy.calledOnce();
	});

	it("#buildServer - uses the default (empty) getActions when not overridden", async () => {
		// A provider that does NOT override getActions() exercises the base default (returns []).
		@injectable()
		class PlainServer extends AbstractServer {
			protected baseName(): string {
				return "Plain";
			}
			protected pluginConfiguration(): Contracts.Kernel.PluginConfiguration {
				return { getRequired: () => 5000 } as unknown as Contracts.Kernel.PluginConfiguration;
			}
			protected defaultOptions(): Record<string, unknown> {
				return {};
			}
		}

		const plainHttpId = Symbol("plain-http");
		const plainHttpsId = Symbol("plain-https");

		@injectable()
		class PlainServiceProvider extends AbstractServiceProvider<AbstractServer> {
			protected httpIdentifier(): symbol {
				return plainHttpId;
			}
			protected httpsIdentifier(): symbol {
				return plainHttpsId;
			}
			protected getServerConstructor(): ServerConstructor<AbstractServer> {
				return PlainServer as unknown as ServerConstructor<AbstractServer>;
			}
			protected getHandlers(): NamedPlugin<unknown> {
				return { name: "h", register: () => {}, version: "1" };
			}
			protected getPlugins(): Plugin<unknown>[] {
				return [];
			}
		}

		const app = new Application();
		app.bind(Identifiers.Services.Log.Service).toConstantValue({ error: () => {}, info: () => {}, warn: () => {} });
		app.bind(Identifiers.Cryptography.Validator).toConstantValue({ addSchema: () => {}, hasSchema: () => false });

		const provider = app.resolve(PlainServiceProvider);
		provider.setConfig(app.resolve(Providers.PluginConfiguration).from("api-common", clone(validConfig)));

		await assert.resolves(() => provider.register());
		assert.true(app.isBound(plainHttpId));
	});

	it("#configSchema - accepts a fully valid config", async ({ serviceProvider }) => {
		const result = (serviceProvider.configSchema() as any).validate(clone(schemaConfig));

		assert.undefined(result.error);
	});

	it("#configSchema - rejects config missing server.http.port", async ({ serviceProvider }) => {
		const config = clone(schemaConfig);
		delete config.server.http.port;

		const result = (serviceProvider.configSchema() as any).validate(config);

		assert.defined(result.error);
	});

	it("#configSchema - requires tls cert/key when https enabled", async ({ serviceProvider }) => {
		const config = clone(schemaConfig);
		config.server.https.enabled = true;
		config.server.https.tls = {};

		const result = (serviceProvider.configSchema() as any).validate(config);

		assert.defined(result.error);
	});

	it("#configSchema - accepts https enabled with tls cert/key present", async ({ serviceProvider }) => {
		const config = clone(schemaConfig);
		config.server.https.enabled = true;
		config.server.https.tls = { cert: "cert-path", key: "key-path" };

		const result = (serviceProvider.configSchema() as any).validate(config);

		assert.undefined(result.error);
	});
});
