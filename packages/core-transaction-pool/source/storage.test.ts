import { Container } from "@arkecosystem/core-kernel";
import { Identities, Interfaces, Managers, Transactions } from "@arkecosystem/crypto";
import fs from "fs-extra";
import { describe } from "@arkecosystem/core-test-framework";
import { Storage } from "./";
import { Stub } from "@arkecosystem/core-test-framework/distribution/uvu/stub";

const buildTransaction = (nonce: string): Interfaces.ITransaction => {
	return Transactions.BuilderFactory.transfer()
		.version(2)
		.amount("100")
		.recipientId(Identities.Address.fromPassphrase("recipient's secret"))
		.nonce(nonce)
		.fee("900")
		.sign("sender's secret")
		.build();
};

describe<{
	aip: Boolean;
	configuration: any;
	container: Container.Container;
	transaction1: Interfaces.ITransaction;
	transaction2: Interfaces.ITransaction;
	ensureFileSync: Stub;
}>("Storage", ({ it, beforeAll, afterAll, assert, stub }) => {
	beforeAll((context) => {
		context.configuration = { getRequired: () => undefined };

		context.container = new Container.Container();
		context.container.bind(Container.Identifiers.PluginConfiguration).toConstantValue(context.configuration);

		context.aip = Managers.configManager.getMilestone().aip11;
		Managers.configManager.getMilestone().aip11 = true;

		context.transaction1 = buildTransaction("1");
		context.transaction2 = buildTransaction("2");

		context.ensureFileSync = stub(fs, "ensureFileSync").callsFake(() => {});
	});

	afterAll((context) => {
		Managers.configManager.getMilestone().aip11 = context.aip;

		context.ensureFileSync.restore();
	});

	it("boot - should instantiate BetterSqlite3 using configured filename", (context) => {
		stub(context.configuration, "getRequired").returnValueOnce(":memory:"); // storage
		const storage = context.container.resolve(Storage);
		storage.boot();

		try {
			const database = storage["database"];
			context.ensureFileSync.calledWith(":memory:");
			assert.equal(database.name, ":memory:");
			assert.true(database.open);
		} finally {
			storage.dispose();
		}
	});

	it("dispose - should close database", (context) => {
		stub(context.configuration, "getRequired").returnValueOnce(":memory:"); // storage
		const storage = context.container.resolve(Storage);
		storage.boot();
		const database = storage["database"];

		storage.dispose();

		assert.false(database.open);
	});

	it("hasTransaction - should find transaction that was added", (context) => {
		stub(context.configuration, "getRequired").returnValueOnce(":memory:"); // storage
		const storage = context.container.resolve(Storage);
		storage.boot();

		try {
			storage.addTransaction({
				height: 100,
				id: context.transaction1.id,
				senderPublicKey: context.transaction1.data.senderPublicKey,
				serialized: context.transaction1.serialized,
			});

			const has = storage.hasTransaction(context.transaction1.id);
			assert.true(has);
		} finally {
			storage.dispose();
		}
	});

	it("hasTransaction - should not find transaction that wasn't added", (context) => {
		stub(context.configuration, "getRequired").returnValueOnce(":memory:"); // storage
		const storage = context.container.resolve(Storage);
		storage.boot();

		try {
			storage.addTransaction({
				height: 100,
				id: context.transaction1.id,
				senderPublicKey: context.transaction1.data.senderPublicKey,
				serialized: context.transaction1.serialized,
			});

			const has = storage.hasTransaction(context.transaction2.id);
			assert.false(has);
		} finally {
			storage.dispose();
		}
	});

	it("getAllTransactions - should return all added transactions", (context) => {
		stub(context.configuration, "getRequired").returnValueOnce(":memory:"); // storage
		const storage = context.container.resolve(Storage);
		storage.boot();

		try {
			const storedTransaction1 = {
				height: 100,
				id: context.transaction1.id,
				senderPublicKey: context.transaction1.data.senderPublicKey,
				serialized: context.transaction1.serialized,
			};

			const storedTransaction2 = {
				height: 100,
				id: context.transaction2.id,
				senderPublicKey: context.transaction2.data.senderPublicKey,
				serialized: context.transaction2.serialized,
			};

			storage.addTransaction(storedTransaction1);
			storage.addTransaction(storedTransaction2);

			const allTransactions = Array.from(storage.getAllTransactions());
			assert.equal(allTransactions, [storedTransaction1, storedTransaction2]);
		} finally {
			storage.dispose();
		}
	});

	it("getOldTransactions - should return only old transactions", (context) => {
		stub(context.configuration, "getRequired").returnValueOnce(":memory:"); // storage
		const storage = context.container.resolve(Storage);
		storage.boot();

		try {
			const storedTransaction1 = {
				height: 100,
				id: context.transaction1.id,
				senderPublicKey: context.transaction1.data.senderPublicKey,
				serialized: context.transaction1.serialized,
			};

			const storedTransaction2 = {
				height: 200,
				id: context.transaction2.id,
				senderPublicKey: context.transaction2.data.senderPublicKey,
				serialized: context.transaction2.serialized,
			};

			storage.addTransaction(storedTransaction1);
			storage.addTransaction(storedTransaction2);

			const oldTransactions = Array.from(storage.getOldTransactions(100));
			assert.equal(oldTransactions, [storedTransaction1]);
		} finally {
			storage.dispose();
		}
	});

	it("getOldTransactions - should return all old transactions", (context) => {
		stub(context.configuration, "getRequired").returnValueOnce(":memory:"); // storage
		const storage = context.container.resolve(Storage);
		storage.boot();

		try {
			const storedTransaction1 = {
				height: 100,
				id: context.transaction1.id,
				senderPublicKey: context.transaction1.data.senderPublicKey,
				serialized: context.transaction1.serialized,
			};

			const storedTransaction2 = {
				height: 200,
				id: context.transaction2.id,
				senderPublicKey: context.transaction2.data.senderPublicKey,
				serialized: context.transaction2.serialized,
			};

			storage.addTransaction(storedTransaction1);
			storage.addTransaction(storedTransaction2);

			const oldTransactions = Array.from(storage.getOldTransactions(200));
			assert.equal(oldTransactions, [storedTransaction2, storedTransaction1]);
		} finally {
			storage.dispose();
		}
	});

	it("addTransaction - should add new transaction", (context) => {
		stub(context.configuration, "getRequired").returnValueOnce(":memory:"); // storage
		const storage = context.container.resolve(Storage);
		storage.boot();

		try {
			storage.addTransaction({
				height: 100,
				id: context.transaction1.id,
				senderPublicKey: context.transaction1.data.senderPublicKey,
				serialized: context.transaction1.serialized,
			});

			const has = storage.hasTransaction(context.transaction1.id);
			assert.true(has);
		} finally {
			storage.dispose();
		}
	});

	it("addTransaction - should throw when adding same transaction twice", (context) => {
		stub(context.configuration, "getRequired").returnValueOnce(":memory:"); // storage
		const storage = context.container.resolve(Storage);
		storage.boot();

		try {
			storage.addTransaction({
				height: 100,
				id: context.transaction1.id,
				senderPublicKey: context.transaction1.data.senderPublicKey,
				serialized: context.transaction1.serialized,
			});

			assert.throws(() => {
				storage.addTransaction({
					height: 100,
					id: context.transaction1.id,
					senderPublicKey: context.transaction1.data.senderPublicKey,
					serialized: context.transaction1.serialized,
				});
			});
		} finally {
			storage.dispose();
		}
	});

	it("removeTransaction - should remove previously added transaction", (context) => {
		stub(context.configuration, "getRequired").returnValueOnce(":memory:"); // storage
		const storage = context.container.resolve(Storage);
		storage.boot();

		try {
			storage.addTransaction({
				height: 100,
				id: context.transaction1.id,
				senderPublicKey: context.transaction1.data.senderPublicKey,
				serialized: context.transaction1.serialized,
			});

			storage.removeTransaction(context.transaction1.id);

			const has = storage.hasTransaction(context.transaction1.id);
			assert.false(has);
		} finally {
			storage.dispose();
		}
	});

	it("flush - should remove all previously added transactions", (context) => {
		stub(context.configuration, "getRequired").returnValueOnce(":memory:"); // storage
		const storage = context.container.resolve(Storage);
		storage.boot();

		try {
			storage.addTransaction({
				height: 100,
				id: context.transaction1.id,
				senderPublicKey: context.transaction1.data.senderPublicKey,
				serialized: context.transaction1.serialized,
			});

			storage.addTransaction({
				height: 100,
				id: context.transaction2.id,
				senderPublicKey: context.transaction2.data.senderPublicKey,
				serialized: context.transaction2.serialized,
			});

			storage.flush();

			const allTransactions = Array.from(storage.getAllTransactions());
			assert.equal(allTransactions, []);
		} finally {
			storage.dispose();
		}
	});
});
