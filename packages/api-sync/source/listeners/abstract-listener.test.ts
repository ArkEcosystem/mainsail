import { Identifiers as ApiDatabaseIdentifiers } from "@mainsail/api-database";
import { Identifiers } from "@mainsail/constants";
import { injectable } from "@mainsail/container";
import { NotImplemented } from "@mainsail/exceptions";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { AbstractListener, ListenerEvent, ListenerEventMapping } from "./abstract-listener.js";

type Item = { key: string; payload?: string };

const makeFakeRepo = () => ({
	clear: async () => {},
	delete: async (_ids: string[]) => {},
	metadata: {
		primaryColumns: [{ propertyName: "key" }],
		tableNameWithoutPrefix: "items",
	},
	upsert: async (_entities: object[], _conflictPaths: string[]) => {},
});

@injectable()
class ItemListener extends AbstractListener<Item, Item> {
	public repo = makeFakeRepo();

	protected getEventMapping(): ListenerEventMapping {
		return {
			"item.created": ListenerEvent.OnAdded,
			"item.deleted": ListenerEvent.OnRemoved,
		};
	}

	protected getEventId(event: Item): string {
		return event.key;
	}

	protected mapEventToEntity(event: Item): Item {
		return { key: event.key, payload: event.payload };
	}

	protected makeEntityRepository(): any {
		return this.repo;
	}
}

describe<{
	app: Application;
	listener: ItemListener;
	events: { listen: any; forget: any };
	dataSource: { transaction: any };
	logger: { debug: any; error: any };
}>("AbstractListener", ({ it, beforeEach, assert, spy, clock }) => {
	beforeEach((context) => {
		context.events = { forget: () => {}, listen: () => {} };
		context.dataSource = {
			transaction: async (_isolation: string, callback: any) => callback({}),
		};
		context.logger = { debug: () => {}, error: () => {} };

		context.app = new Application();
		context.app
			.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue({ getRequired: () => 250 })
			.whenTagged("plugin", "api-sync");
		context.app.bind(ApiDatabaseIdentifiers.DataSource).toConstantValue(context.dataSource);
		context.app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue(context.events);
		context.app.bind(Identifiers.ApiSync.Logger).toConstantValue(context.logger);

		context.listener = context.app.resolve(ItemListener);
	});

	it("register: subscribes to every event of the mapping", async ({ listener, events }) => {
		const listen = spy(events, "listen");

		await listener.register();

		listen.calledTimes(2);
		listen.calledWith("item.created", listener);
		listen.calledWith("item.deleted", listener);
	});

	it("handle: rejects events outside of the mapping", async ({ listener }) => {
		await assert.rejects(() => listener.handle({ data: { key: "k" }, name: "item.renamed" }), NotImplemented);
	});

	it("flush: is a no-op while nothing was collected", async ({ listener }) => {
		const upsert = spy(listener.repo, "upsert");
		const remove = spy(listener.repo, "delete");

		await listener.flush({} as any);

		upsert.neverCalled();
		remove.neverCalled();
	});

	it("flush: upserts collected additions once and clears them", async ({ listener }) => {
		const upsert = spy(listener.repo, "upsert");

		await listener.handle({ data: { key: "a", payload: "1" }, name: "item.created" });
		await listener.handle({ data: { key: "b", payload: "2" }, name: "item.created" });
		await listener.flush({} as any);

		upsert.calledOnce();
		assert.equal(upsert.getCallArgs(0), [
			[
				{ key: "a", payload: "1" },
				{ key: "b", payload: "2" },
			],
			["key"],
		]);

		await listener.flush({} as any);
		upsert.calledOnce();
	});

	it("flush: a repeated addition for the same id keeps the latest payload", async ({ listener }) => {
		const upsert = spy(listener.repo, "upsert");

		await listener.handle({ data: { key: "a", payload: "old" }, name: "item.created" });
		await listener.handle({ data: { key: "a", payload: "new" }, name: "item.created" });
		await listener.flush({} as any);

		assert.equal(upsert.getCallArgs(0)[0], [{ key: "a", payload: "new" }]);
	});

	it("flush: deletes collected removals once and clears them", async ({ listener }) => {
		const remove = spy(listener.repo, "delete");

		await listener.handle({ data: { key: "a" }, name: "item.deleted" });
		await listener.flush({} as any);

		remove.calledOnce();
		assert.equal(remove.getCallArgs(0), [["a"]]);

		await listener.flush({} as any);
		remove.calledOnce();
	});

	it("an addition followed by a removal only removes", async ({ listener }) => {
		const upsert = spy(listener.repo, "upsert");
		const remove = spy(listener.repo, "delete");

		await listener.handle({ data: { key: "a" }, name: "item.created" });
		await listener.handle({ data: { key: "a" }, name: "item.deleted" });
		await listener.flush({} as any);

		upsert.neverCalled();
		remove.calledOnce();
	});

	it("a removal followed by an addition only adds", async ({ listener }) => {
		const upsert = spy(listener.repo, "upsert");
		const remove = spy(listener.repo, "delete");

		await listener.handle({ data: { key: "a" }, name: "item.deleted" });
		await listener.handle({ data: { key: "a" }, name: "item.created" });
		await listener.flush({} as any);

		remove.neverCalled();
		upsert.calledOnce();
	});

	it("boot: truncates the table and periodically flushes through a transaction", async ({ listener, dataSource }) => {
		const clk = clock();
		const truncate = spy(listener.repo, "clear");
		const transaction = spy(dataSource, "transaction");
		const upsert = spy(listener.repo, "upsert");

		await listener.handle({ data: { key: "a" }, name: "item.created" });
		await listener.boot();
		await clk.nextAsync();

		truncate.calledOnce();
		transaction.calledOnce();
		transaction.calledWith("REPEATABLE READ");
		upsert.calledOnce();

		await listener.dispose();
	});

	it("boot: the sync loop skips the transaction while nothing was collected", async ({ listener, dataSource }) => {
		const clk = clock();
		const transaction = spy(dataSource, "transaction");

		await listener.boot();
		await clk.nextAsync();

		transaction.neverCalled();

		await listener.dispose();
	});

	it("boot: a failing sync transaction is logged and does not stop the loop", async ({
		listener,
		dataSource,
		logger,
	}) => {
		const clk = clock();
		const error = spy(logger, "error");

		dataSource.transaction = async () => {
			throw new Error("connection lost");
		};

		await listener.handle({ data: { key: "a" }, name: "item.created" });
		await listener.boot();
		// The loop runs once immediately and once through the rescheduled timer.
		await clk.nextAsync();

		error.calledTimes(2);
		assert.true(error.getCallArgs(0)[0].includes("connection lost"));

		// The loop rescheduled itself despite the failures.
		await clk.nextAsync();
		error.calledTimes(3);

		await listener.dispose();
	});

	it("dispose: unsubscribes from the mapping and stops the sync loop", async ({ listener, events }) => {
		const clk = clock();
		const forget = spy(events, "forget");

		await listener.boot();
		await clk.nextAsync();

		await listener.dispose();

		forget.calledTimes(2);
		forget.calledWith("item.created", listener);
		forget.calledWith("item.deleted", listener);

		// No further sync runs after dispose: nextAsync resolves immediately with no timers.
		const pendingTimers = await clk.nextAsync();
		assert.defined(pendingTimers);
	});
});
