import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { dirSync, setGracefulCleanup } from "tmp";

import { Storage } from "./storage";

const storedTransaction1 = {
	blockNumber: 100,
	hash: "3a5823fe8f498b2e509974b3939584bd1200ad32fa32bc8a1a778b608f79f780",
	senderPublicKey: "03e0812731df97edc9990d55d919b33294f131b5fd44996266859cfd2514514121",
	serialized: Buffer.from("first-serialized"),
};

const storedTransaction2 = {
	blockNumber: 200,
	hash: "1c54b0cd259d807f8b8a1afbedc36ffcd1ba2feaed306c6ac958b59644028572",
	senderPublicKey: "02c9b561bc6daa0a89343237e92f4ac75022f260f6371c22a6bbe35dfe839938ec",
	serialized: Buffer.from("second-serialized"),
};

const storedTransaction3 = {
	blockNumber: 300,
	hash: "82800039759baa5c05356b1106995efa6334d3b321ec693ed04aaca482843618",
	senderPublicKey: "028786d7026170b8f76013282801f62feec4c1fb28ef9d95bc23e9f69c6b1b17c2",
	serialized: Buffer.from("third-serialized"),
};

describe<{
	storage: Storage;
}>("Storage", ({ it, beforeEach, afterEach, assert }) => {
	beforeEach((context) => {
		const app = new Application();
		app.bind(Identifiers.ServiceProvider.Configuration).toConstantValue({ getRequired: () => ":memory:" });

		context.storage = app.resolve(Storage);
		context.storage.boot();
	});

	afterEach(({ storage }) => {
		storage.dispose();
	});

	it("boot - should instantiate BetterSqlite3 in-memory", ({ storage }) => {
		const database = storage.getDatabase();

		assert.equal(database.name, ":memory:");
		assert.true(database.open);
	});

	it("dispose - should close database", ({ storage }) => {
		const database = storage.getDatabase();
		assert.true(database.open);

		storage.dispose();

		assert.false(database.open);
	});

	it("hasTransaction - should find transaction that was added", ({ storage }) => {
		storage.addTransaction(storedTransaction1);

		assert.true(storage.hasTransaction(storedTransaction1.hash));
	});

	it("hasTransaction - should not find transaction that wasn't added", ({ storage }) => {
		storage.addTransaction(storedTransaction1);

		assert.false(storage.hasTransaction(storedTransaction2.hash));
	});

	it("getAllTransactions - should return all added transactions", ({ storage }) => {
		storage.addTransaction(storedTransaction1);
		storage.addTransaction(storedTransaction2);

		assert.equal([...storage.getAllTransactions()], [storedTransaction1, storedTransaction2]);
	});

	it("getOldTransactions - should return only old transactions", ({ storage }) => {
		storage.addTransaction(storedTransaction1);
		storage.addTransaction(storedTransaction2);

		assert.equal([...storage.getOldTransactions(100)], [storedTransaction1]);
	});

	it("getOldTransactions - should return all old transactions", ({ storage }) => {
		storage.addTransaction(storedTransaction1);
		storage.addTransaction(storedTransaction2);

		assert.equal([...storage.getOldTransactions(200)], [storedTransaction2, storedTransaction1]);
	});

	it("getOldTransactions - should return N old transactions", ({ storage }) => {
		storage.addTransaction(storedTransaction1);
		storage.addTransaction(storedTransaction2);
		storage.addTransaction(storedTransaction3);

		assert.equal([...storage.getOldTransactions(300, 2)], [storedTransaction3, storedTransaction2]);
		assert.equal(
			[...storage.getOldTransactions(300, 5)],
			[storedTransaction3, storedTransaction2, storedTransaction1],
		);
		assert.equal([...storage.getOldTransactions(100, 2)], [storedTransaction1]);
		assert.equal([...storage.getOldTransactions(200, 2)], [storedTransaction2, storedTransaction1]);
	});

	it("addTransaction - should throw when adding same transaction twice", ({ storage }) => {
		storage.addTransaction(storedTransaction1);

		assert.throws(() => storage.addTransaction(storedTransaction1), "UNIQUE constraint failed");
	});

	it("removeTransaction - should remove previously added transaction", ({ storage }) => {
		storage.addTransaction(storedTransaction1);
		assert.true(storage.hasTransaction(storedTransaction1.hash));

		storage.removeTransaction(storedTransaction1.hash);

		assert.false(storage.hasTransaction(storedTransaction1.hash));
	});

	it("flush - should remove all previously added transactions", ({ storage }) => {
		storage.addTransaction(storedTransaction1);
		storage.addTransaction(storedTransaction2);
		assert.length([...storage.getAllTransactions()], 2);

		storage.flush();

		assert.equal([...storage.getAllTransactions()], []);
	});
});

describe<{
	filename: string;
	storage: Storage;
}>("Storage (file)", ({ it, beforeAll, beforeEach, assert }) => {
	beforeAll(() => setGracefulCleanup());

	beforeEach((context) => {
		context.filename = join(dirSync({ unsafeCleanup: true }).name, "data", "transaction-pool.sqlite");

		const app = new Application();
		app.bind(Identifiers.ServiceProvider.Configuration).toConstantValue({ getRequired: () => context.filename });

		context.storage = app.resolve(Storage);
	});

	// No afterEach dispose here: it throws for a storage that failed to boot, and uvu then reports the run as passed.

	it("boot - should create the database file and its missing directories", ({ storage, filename }) => {
		assert.false(existsSync(filename));

		storage.boot();

		assert.true(existsSync(filename));
		assert.equal(storage.getDatabase().name, filename);
		assert.true(storage.getDatabase().open);

		storage.dispose();
	});

	it("boot - should keep stored transactions across restarts", ({ storage }) => {
		storage.boot();
		storage.addTransaction(storedTransaction1);
		storage.dispose();

		storage.boot();

		assert.equal([...storage.getAllTransactions()], [storedTransaction1]);

		storage.dispose();
	});
});
