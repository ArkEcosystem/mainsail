import { Container } from "@arkecosystem/core-container";
import { Identifiers } from "@arkecosystem/core-contracts";
import { Configuration } from "@arkecosystem/core-crypto-config";
import { Application } from "@arkecosystem/core-kernel";
import fs from "fs-extra";

import { describe } from "../../core-test-framework";
import { Stub } from "../../core-test-framework/source/uvu/stub";
import { Storage } from ".";

describe<{
	configuration: any;
	app: Application;
	ensureFileSync: Stub;
	config: Configuration;
}>("Storage", ({ it, beforeAll, afterAll, assert, stub }) => {
	beforeAll(async (context) => {
		context.configuration = { getRequired: () => {} };

		context.app = new Application(new Container());
		context.app.bind(Identifiers.PluginConfiguration).toConstantValue(context.configuration);

		context.ensureFileSync = stub(fs, "ensureFileSync").callsFake(() => {});
	});

	afterAll((context) => {
		context.ensureFileSync.restore();
	});

	it("boot - should instantiate BetterSqlite3 using configured filename", (context) => {
		stub(context.configuration, "getRequired").returnValueOnce(":memory:"); // storage
		const storage = context.app.resolve(Storage);
		storage.boot();

		try {
			const database = storage.getDatabase();
			context.ensureFileSync.calledWith(":memory:");
			assert.equal(database.name, ":memory:");
			assert.true(database.open);
		} finally {
			storage.dispose();
		}
	});

	it("dispose - should close database", (context) => {
		stub(context.configuration, "getRequired").returnValueOnce(":memory:"); // storage
		const storage = context.app.resolve(Storage);
		storage.boot();
		const database = storage.getDatabase();

		storage.dispose();

		assert.false(database.open);
	});

	it("hasTransaction - should find transaction that was added", (context) => {
		stub(context.configuration, "getRequired").returnValueOnce(":memory:"); // storage
		const storage = context.app.resolve(Storage);
		storage.boot();

		try {
			storage.addTransaction({
				height: 100,
				id: "first-tx-id",
				senderPublicKey: "some-public-key",
				serialized: Buffer.from("test"),
			});

			const has = storage.hasTransaction("first-tx-id");
			assert.true(has);
		} finally {
			storage.dispose();
		}
	});

	it("hasTransaction - should not find transaction that wasn't added", (context) => {
		stub(context.configuration, "getRequired").returnValueOnce(":memory:"); // storage
		const storage = context.app.resolve(Storage);
		storage.boot();

		try {
			storage.addTransaction({
				height: 100,
				id: "first-tx-id",
				senderPublicKey: "some-public-key",
				serialized: Buffer.from("test"),
			});

			const has = storage.hasTransaction("second-tx-id");
			assert.false(has);
		} finally {
			storage.dispose();
		}
	});

	it("getAllTransactions - should return all added transactions", (context) => {
		stub(context.configuration, "getRequired").returnValueOnce(":memory:"); // storage
		const storage = context.app.resolve(Storage);
		storage.boot();

		try {
			const storedTransaction1 = {
				height: 100,
				id: "first-tx-id",
				senderPublicKey: "some-public-key",
				serialized: Buffer.from("test"),
			};

			const storedTransaction2 = {
				height: 100,
				id: "second-tx-id",
				senderPublicKey: "second-public-key",
				serialized: Buffer.from("second-serialized"),
			};

			storage.addTransaction(storedTransaction1);
			storage.addTransaction(storedTransaction2);

			const allTransactions = [...storage.getAllTransactions()];
			assert.equal(allTransactions, [storedTransaction1, storedTransaction2]);
		} finally {
			storage.dispose();
		}
	});

	it("getOldTransactions - should return only old transactions", (context) => {
		stub(context.configuration, "getRequired").returnValueOnce(":memory:"); // storage
		const storage = context.app.resolve(Storage);
		storage.boot();

		try {
			const storedTransaction1 = {
				height: 100,
				id: "first-tx-id",
				senderPublicKey: "some-public-key",
				serialized: Buffer.from("test"),
			};

			const storedTransaction2 = {
				height: 200,
				id: "second-tx-id",
				senderPublicKey: "second-public-key",
				serialized: Buffer.from("second-serialized"),
			};

			storage.addTransaction(storedTransaction1);
			storage.addTransaction(storedTransaction2);

			const oldTransactions = [...storage.getOldTransactions(100)];
			assert.equal(oldTransactions, [storedTransaction1]);
		} finally {
			storage.dispose();
		}
	});

	it("getOldTransactions - should return all old transactions", (context) => {
		stub(context.configuration, "getRequired").returnValueOnce(":memory:"); // storage
		const storage = context.app.resolve(Storage);
		storage.boot();

		try {
			const storedTransaction1 = {
				height: 100,
				id: "first-tx-id",
				senderPublicKey: "some-public-key",
				serialized: Buffer.from("test"),
			};

			const storedTransaction2 = {
				height: 200,
				id: "second-tx-id",
				senderPublicKey: "second-public-key",
				serialized: Buffer.from("second-serialized"),
			};

			storage.addTransaction(storedTransaction1);
			storage.addTransaction(storedTransaction2);

			const oldTransactions = [...storage.getOldTransactions(200)];
			assert.equal(oldTransactions, [storedTransaction2, storedTransaction1]);
		} finally {
			storage.dispose();
		}
	});

	it("addTransaction - should add new transaction", (context) => {
		stub(context.configuration, "getRequired").returnValueOnce(":memory:"); // storage
		const storage = context.app.resolve(Storage);
		storage.boot();

		try {
			storage.addTransaction({
				height: 100,
				id: "first-tx-id",
				senderPublicKey: "some-public-key",
				serialized: Buffer.from("test"),
			});

			const has = storage.hasTransaction("first-tx-id");
			assert.true(has);
		} finally {
			storage.dispose();
		}
	});

	it("addTransaction - should throw when adding same transaction twice", (context) => {
		stub(context.configuration, "getRequired").returnValueOnce(":memory:"); // storage
		const storage = context.app.resolve(Storage);
		storage.boot();

		try {
			storage.addTransaction({
				height: 100,
				id: "first-tx-id",
				senderPublicKey: "some-public-key",
				serialized: Buffer.from("test"),
			});

			assert.throws(() => {
				storage.addTransaction({
					height: 100,
					id: "first-tx-id",
					senderPublicKey: "some-public-key",
					serialized: Buffer.from("test"),
				});
			});
		} finally {
			storage.dispose();
		}
	});

	it("removeTransaction - should remove previously added transaction", (context) => {
		stub(context.configuration, "getRequired").returnValueOnce(":memory:"); // storage
		const storage = context.app.resolve(Storage);
		storage.boot();

		try {
			storage.addTransaction({
				height: 100,
				id: "first-tx-id",
				senderPublicKey: "some-public-key",
				serialized: Buffer.from("test"),
			});

			storage.removeTransaction("first-tx-id");

			const has = storage.hasTransaction("first-tx-id");
			assert.false(has);
		} finally {
			storage.dispose();
		}
	});

	it("flush - should remove all previously added transactions", (context) => {
		stub(context.configuration, "getRequired").returnValueOnce(":memory:"); // storage
		const storage = context.app.resolve(Storage);
		storage.boot();

		try {
			storage.addTransaction({
				height: 100,
				id: "first-tx-id",
				senderPublicKey: "dummy-sender-key-1",
				serialized: Buffer.from("dummy-serialized-1"),
			});

			storage.addTransaction({
				height: 100,
				id: "second-tx-id",
				senderPublicKey: "dummy-sender-key-2",
				serialized: Buffer.from("dummy-serialized-2"),
			});

			storage.flush();

			const allTransactions = [...storage.getAllTransactions()];
			assert.equal(allTransactions, []);
		} finally {
			storage.dispose();
		}
	});
});
