import { Identifiers as ApiDatabaseIdentifiers } from "@mainsail/api-database";
import { Events, Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { ApiNodes } from "./api-nodes.js";

const makeFakeRepo = () => ({
	clear: () => {},
	delete: () => {},
	metadata: {
		primaryColumns: [{ propertyName: "url" }],
		tableNameWithoutPrefix: "api_nodes",
	},
	upsert: () => {},
});

describe<{
	app: Application;
	listener: ApiNodes;
	events: { listen: any; forget: any };
	repo: ReturnType<typeof makeFakeRepo>;
	repositoryFactory: any;
}>("ApiNodes", ({ it, beforeEach, assert, spy }) => {
	beforeEach((context) => {
		context.events = { forget: () => {}, listen: () => {} };
		context.repo = makeFakeRepo();
		context.repositoryFactory = (dataSource: unknown) => context.repo;

		context.app = new Application();
		context.app
			.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue({ getRequired: () => 1000 })
			.whenTagged("plugin", "api-sync");
		context.app.bind(ApiDatabaseIdentifiers.DataSource).toConstantValue({});
		context.app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue(context.events);
		context.app.bind(Identifiers.ApiSync.Logger).toConstantValue({ debug: () => {}, error: () => {} });
		context.app.bind(ApiDatabaseIdentifiers.ApiNodeRepositoryFactory).toConstantValue(context.repositoryFactory);

		context.listener = context.app.resolve(ApiNodes);
	});

	const apiNode = { height: 42, latency: 5, url: "http://1.1.1.1:4003", version: "1.0.0" } as any;

	it("register: listens on the added and removed events", async ({ listener, events }) => {
		const listen = spy(events, "listen");

		await listener.register();

		listen.calledWith(Events.ApiNodeEvent.Added, listener);
		listen.calledWith(Events.ApiNodeEvent.Removed, listener);
		listen.calledTimes(2);
	});

	it("added event: flush upserts the entity keyed by url", async ({ listener, repo }) => {
		const upsert = spy(repo, "upsert");

		await listener.handle({ data: apiNode, name: Events.ApiNodeEvent.Added });
		await listener.flush({} as any);

		upsert.calledOnce();
		assert.equal(upsert.getCallArgs(0), [
			[{ height: 42, latency: 5, url: "http://1.1.1.1:4003", version: "1.0.0" }],
			["url"],
		]);
	});

	it("removed event: flush deletes by url", async ({ listener, repo }) => {
		const del = spy(repo, "delete");

		await listener.handle({ data: apiNode, name: Events.ApiNodeEvent.Removed });
		await listener.flush({} as any);

		del.calledOnce();
		assert.equal(del.getCallArgs(0), [["http://1.1.1.1:4003"]]);
	});
});
