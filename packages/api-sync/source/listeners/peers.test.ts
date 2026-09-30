import { Identifiers as ApiDatabaseIdentifiers } from "@mainsail/api-database";
import { Events, Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { Peers } from "./peers.js";

const makeFakeRepo = () => ({
	clear: () => {},
	delete: () => {},
	metadata: {
		primaryColumns: [{ propertyName: "ip" }],
		tableNameWithoutPrefix: "peers",
	},
	upsert: () => {},
});

describe<{
	app: Application;
	listener: Peers;
	events: { listen: any; forget: any };
	repo: ReturnType<typeof makeFakeRepo>;
}>("Peers", ({ it, beforeEach, assert, spy }) => {
	beforeEach((context) => {
		context.events = { forget: () => {}, listen: () => {} };
		context.repo = makeFakeRepo();

		context.app = new Application();
		context.app
			.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue({ getRequired: () => 1000 })
			.whenTagged("plugin", "api-sync");
		context.app.bind(ApiDatabaseIdentifiers.DataSource).toConstantValue({});
		context.app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue(context.events);
		context.app.bind(Identifiers.ApiSync.Logger).toConstantValue({ debug: () => {}, error: () => {} });
		context.app.bind(ApiDatabaseIdentifiers.PeerRepositoryFactory).toConstantValue(() => context.repo);

		context.listener = context.app.resolve(Peers);
	});

	const peer = {
		header: { blockNumber: 7 },
		ip: "127.0.0.1",
		latency: 12,
		plugins: { "api-http": { enabled: true } },
		port: 4002,
		ports: { "api-http": 4003 },
		version: "1.2.3",
	} as any;

	it("register: listens on the added, removed and updated events", async ({ listener, events }) => {
		const listen = spy(events, "listen");

		await listener.register();

		listen.calledWith(Events.PeerEvent.Added, listener);
		listen.calledWith(Events.PeerEvent.Removed, listener);
		listen.calledWith(Events.PeerEvent.Updated, listener);
		listen.calledTimes(3);
	});

	it("added event: flush upserts the mapped peer entity keyed by ip", async ({ listener, repo }) => {
		const upsert = spy(repo, "upsert");

		await listener.handle({ data: peer, name: Events.PeerEvent.Added });
		await listener.flush({} as any);

		upsert.calledOnce();
		assert.equal(upsert.getCallArgs(0), [
			[
				{
					blockNumber: 7,
					ip: "127.0.0.1",
					latency: 12,
					plugins: peer.plugins,
					port: 4002,
					ports: peer.ports,
					version: "1.2.3",
				},
			],
			["ip"],
		]);
	});

	it("updated event: is treated as an upsert", async ({ listener, repo }) => {
		const upsert = spy(repo, "upsert");
		const del = spy(repo, "delete");

		await listener.handle({ data: peer, name: Events.PeerEvent.Updated });
		await listener.flush({} as any);

		del.neverCalled();
		upsert.calledOnce();
	});

	it("removed event: flush deletes by ip", async ({ listener, repo }) => {
		const del = spy(repo, "delete");

		await listener.handle({ data: peer, name: Events.PeerEvent.Removed });
		await listener.flush({} as any);

		del.calledOnce();
		assert.equal(del.getCallArgs(0), [["127.0.0.1"]]);
	});

	it("rejects a peer without a string ip", async ({ listener }) => {
		await assert.rejects(() => listener.handle({ data: { ...peer, ip: undefined }, name: Events.PeerEvent.Added }));
	});
});
