import { Identifiers as ApiDatabaseIdentifiers } from "@mainsail/api-database";
import { Events, Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { Plugins } from "./plugins.js";

const makeFakeRepo = () => ({
	clear: () => {},
	delete: () => {},
	metadata: {
		primaryColumns: [{ propertyName: "name" }],
		tableNameWithoutPrefix: "plugins",
	},
	upsert: () => {},
});

describe<{
	app: Application;
	listener: Plugins;
	events: { listen: any; forget: any };
	repo: ReturnType<typeof makeFakeRepo>;
	pluginConfig: Record<string, unknown>;
}>("Plugins", ({ it, beforeEach, assert, spy }) => {
	beforeEach((context) => {
		context.events = { forget: () => {}, listen: () => {} };
		context.repo = makeFakeRepo();
		context.pluginConfig = {};

		context.app = new Application();
		context.app
			.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue({ getRequired: () => 1000 })
			.whenTagged("plugin", "api-sync");
		context.app.bind(ApiDatabaseIdentifiers.DataSource).toConstantValue({});
		context.app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue(context.events);
		context.app.bind(Identifiers.ApiSync.Logger).toConstantValue({ debug: () => {}, error: () => {} });
		context.app.bind(ApiDatabaseIdentifiers.PluginRepositoryFactory).toConstantValue(() => context.repo);
		context.app.rebind(Identifiers.ServiceProvider.Repository).toConstantValue({
			get: () => ({ config: () => ({ all: () => context.pluginConfig }) }),
		});

		context.listener = context.app.resolve(Plugins);
	});

	it("register: listens on the service provider booted event", async ({ listener, events }) => {
		const listen = spy(events, "listen");

		await listener.register();

		listen.calledWith(Events.KernelEvent.ServiceProviderBooted, listener);
		listen.calledTimes(1);
	});

	it("booted event: flush upserts the plugin with its configuration", async (context) => {
		const { listener, repo } = context;
		context.pluginConfig = { syncInterval: 8000 };
		const upsert = spy(repo, "upsert");

		await listener.handle({ data: { name: "api-sync" }, name: Events.KernelEvent.ServiceProviderBooted });
		await listener.flush({} as any);

		upsert.calledOnce();
		assert.equal(upsert.getCallArgs(0), [[{ configuration: { syncInterval: 8000 }, name: "api-sync" }], ["name"]]);
	});

	it("masks password values, including nested ones", async (context) => {
		const { listener, repo } = context;
		context.pluginConfig = {
			database: { host: "localhost", password: "super-secret" },
			password: "top-level-secret",
			username: "postgres",
		};
		const upsert = spy(repo, "upsert");

		await listener.handle({ data: { name: "api-database" }, name: Events.KernelEvent.ServiceProviderBooted });
		await listener.flush({} as any);

		const [[entity]] = upsert.getCallArgs(0) as [any[]];
		assert.equal(entity.configuration, {
			database: { host: "localhost", password: "-" },
			password: "-",
			username: "postgres",
		});
	});

	it("masks password keys regardless of casing", async (context) => {
		const { listener, repo } = context;
		context.pluginConfig = { PASSWORD: "secret", Password: "secret" };
		const upsert = spy(repo, "upsert");

		await listener.handle({ data: { name: "p2p" }, name: Events.KernelEvent.ServiceProviderBooted });
		await listener.flush({} as any);

		const [[entity]] = upsert.getCallArgs(0) as [any[]];
		assert.equal(entity.configuration, { PASSWORD: "-", Password: "-" });
	});
});
