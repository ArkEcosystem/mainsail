import { Identifiers as ApiDatabaseIdentifiers } from "@mainsail/api-database";
import { Events, Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { Listeners } from "./listeners.js";

const makeFakeRepo = (primaryColumn: string, tableName: string) => ({
	clear: () => {},
	delete: () => {},
	metadata: {
		primaryColumns: [{ propertyName: primaryColumn }],
		tableNameWithoutPrefix: tableName,
	},
	upsert: () => {},
});

describe<{
	app: Application;
	listeners: Listeners;
	events: { listen: any; forget: any };
	apiNodeRepo: ReturnType<typeof makeFakeRepo>;
	contractRepo: ReturnType<typeof makeFakeRepo>;
	peerRepo: ReturnType<typeof makeFakeRepo>;
	pluginRepo: ReturnType<typeof makeFakeRepo>;
}>("Listeners", ({ it, beforeEach, assert, spy, clock }) => {
	beforeEach((context) => {
		context.events = { forget: () => {}, listen: () => {} };
		context.apiNodeRepo = makeFakeRepo("url", "api_nodes");
		context.contractRepo = makeFakeRepo("name", "contracts");
		context.peerRepo = makeFakeRepo("ip", "peers");
		context.pluginRepo = makeFakeRepo("name", "plugins");

		context.app = new Application();
		context.app
			.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue({ getRequired: () => 1000 })
			.whenTagged("plugin", "api-sync");
		context.app.bind(ApiDatabaseIdentifiers.DataSource).toConstantValue({});
		context.app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue(context.events);
		context.app.bind(Identifiers.ApiSync.Logger).toConstantValue({ debug: () => {}, error: () => {} });
		context.app.bind(ApiDatabaseIdentifiers.ApiNodeRepositoryFactory).toConstantValue(() => context.apiNodeRepo);
		context.app.bind(ApiDatabaseIdentifiers.ContractRepositoryFactory).toConstantValue(() => context.contractRepo);
		context.app.bind(ApiDatabaseIdentifiers.PeerRepositoryFactory).toConstantValue(() => context.peerRepo);
		context.app.bind(ApiDatabaseIdentifiers.PluginRepositoryFactory).toConstantValue(() => context.pluginRepo);
		context.app.rebind(Identifiers.ServiceProvider.Repository).toConstantValue({
			get: () => ({ config: () => ({ all: () => ({}) }) }),
		});

		context.listeners = context.app.resolve(Listeners);
	});

	it("register: registers every concrete listener on the event dispatcher", async ({ listeners, events }) => {
		const listen = spy(events, "listen");

		await listeners.register();

		// ApiNodes (2) + DeployerContracts (1) + Peers (3) + Plugins (1)
		listen.calledTimes(7);
		listen.calledWith(Events.ApiNodeEvent.Added);
		listen.calledWith(Events.DeployerEvent.ContractCreated);
		listen.calledWith(Events.PeerEvent.Updated);
		listen.calledWith(Events.KernelEvent.ServiceProviderBooted);
	});

	it("bootstrap: boots each registered listener (truncating its table)", async ({
		listeners,
		apiNodeRepo,
		contractRepo,
		peerRepo,
		pluginRepo,
	}) => {
		const clk = clock();
		const clears = [apiNodeRepo, contractRepo, peerRepo, pluginRepo].map((repo) => spy(repo, "clear"));

		await listeners.register();
		await listeners.bootstrap();
		await clk.nextAsync();

		for (const clear of clears) {
			clear.calledOnce();
		}

		await listeners.dispose();
	});

	it("flush: forwards the entity manager to each listener", async ({ listeners, events, peerRepo }) => {
		const captured: Record<string, unknown> = {};
		events.listen = (name: string, listener: unknown) => {
			captured[name] = listener;
		};

		await listeners.register();

		// Feed one peer event through the captured Peers listener, then flush through the aggregate.
		const peers = captured[Events.PeerEvent.Added] as any;
		await peers.handle({
			data: { header: { blockNumber: 1 }, ip: "127.0.0.1", latency: 1, plugins: {}, port: 4002, ports: {} },
			name: Events.PeerEvent.Added,
		});

		const upsert = spy(peerRepo, "upsert");

		await listeners.flush({} as any);

		upsert.calledOnce();
	});

	it("dispose: forgets all events and clears the listener list", async ({ listeners, events }) => {
		const forget = spy(events, "forget");

		await listeners.register();
		await listeners.dispose();

		forget.calledTimes(7);

		// A second dispose is a no-op because the listener list was cleared.
		await listeners.dispose();
		forget.calledTimes(7);
	});
});
