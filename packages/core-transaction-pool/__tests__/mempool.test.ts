import { Container } from "@arkecosystem/core-kernel";
import { Identities, Interfaces } from "@arkecosystem/crypto";

import { Mempool } from "../source/mempool";

const createSenderMempool = jest.fn();
const logger = { debug: jest.fn() };

const container = new Container.Container();
container.bind(Identifiers.TransactionPoolSenderMempoolFactory).toConstantValue(createSenderMempool);
container.bind(Identifiers.LogService).toConstantValue(logger);

beforeEach(() => {
	createSenderMempool.mockReset();
	logger.debug.mockReset();
});

describe("Mempool.getSize", () => {
	it("should return sum of transaction counts of sender states", async () => {
		const senderMempool1 = {
			addTransaction: jest.fn(),
			getSize: jest.fn(),
			isDisposable: jest.fn(),
		};
		senderMempool1.getSize.mockReturnValue(10);
		senderMempool1.isDisposable.mockReturnValue(false);
		createSenderMempool.mockReturnValueOnce(senderMempool1);

		const senderMempool2 = {
			addTransaction: jest.fn(),
			getSize: jest.fn(),
			isDisposable: jest.fn(),
		};
		senderMempool2.getSize.mockReturnValue(20);
		senderMempool2.isDisposable.mockReturnValue(false);
		createSenderMempool.mockReturnValueOnce(senderMempool2);

		const transaction1 = {
			data: { senderPublicKey: Identities.PublicKey.fromPassphrase("sender1") },
			id: "transaction1-id",
		} as Crypto.ITransaction;

		const transaction2 = {
			data: { senderPublicKey: Identities.PublicKey.fromPassphrase("sender2") },
			id: "transaction2-id",
		} as Crypto.ITransaction;

		const memory = container.resolve(Mempool);
		await memory.addTransaction(transaction1);
		await memory.addTransaction(transaction2);
		const size = memory.getSize();

		expect(size).toBe(30);
	});
});

describe("Mempool.hasSenderMempool", () => {
	it("should return true if sender's transaction was added previously", async () => {
		const senderMempool = {
			addTransaction: jest.fn(),
			isDisposable: jest.fn(),
		};
		senderMempool.isDisposable.mockReturnValue(false);
		createSenderMempool.mockReturnValueOnce(senderMempool);

		const transaction = {
			data: { senderPublicKey: Identities.PublicKey.fromPassphrase("sender") },
			id: "transaction-id",
		} as Crypto.ITransaction;

		const memory = container.resolve(Mempool);
		await memory.addTransaction(transaction);
		const has = memory.hasSenderMempool(transaction.data.senderPublicKey);

		expect(has).toBe(true);
	});

	it("should return false if sender's transaction wasn't added previously", async () => {
		const senderMempool = {
			addTransaction: jest.fn(),
			isDisposable: jest.fn(),
		};
		senderMempool.isDisposable.mockReturnValue(false);
		createSenderMempool.mockReturnValueOnce(senderMempool);

		const transaction = {
			data: { senderPublicKey: Identities.PublicKey.fromPassphrase("sender") },
			id: "transaction-id",
		} as Crypto.ITransaction;

		const memory = container.resolve(Mempool);
		await memory.addTransaction(transaction);
		const has = memory.hasSenderMempool(Identities.PublicKey.fromPassphrase("not sender"));

		expect(has).toBe(false);
	});
});

describe("Mempool.getSenderMempool", () => {
	it("should return sender state if sender's transaction was added previously", async () => {
		const senderMempool = {
			addTransaction: jest.fn(),
			isDisposable: jest.fn(),
		};
		senderMempool.isDisposable.mockReturnValue(false);
		createSenderMempool.mockReturnValueOnce(senderMempool);

		const transaction = {
			data: { senderPublicKey: Identities.PublicKey.fromPassphrase("sender") },
			id: "transaction-id",
		} as Crypto.ITransaction;

		const memory = container.resolve(Mempool);
		await memory.addTransaction(transaction);

		expect(memory.getSenderMempool(transaction.data.senderPublicKey)).toBe(senderMempool);
	});

	it("should throw if sender's transaction wasn't added previously", async () => {
		const senderMempool = {
			addTransaction: jest.fn(),
			isDisposable: jest.fn(),
		};
		senderMempool.isDisposable.mockReturnValue(false);
		createSenderMempool.mockReturnValueOnce(senderMempool);

		const transaction = {
			data: { senderPublicKey: Identities.PublicKey.fromPassphrase("sender") },
			id: "transaction-id",
		} as Crypto.ITransaction;

		const memory = container.resolve(Mempool);
		await memory.addTransaction(transaction);
		const callback = () => memory.getSenderMempool(Identities.PublicKey.fromPassphrase("not sender"));

		expect(callback).toThrow();
	});
});

describe("Mempool.getSenderMempools", () => {
	it("should return all sender states", async () => {
		const senderMempool1 = {
			addTransaction: jest.fn(),
			isDisposable: jest.fn(),
		};
		senderMempool1.isDisposable.mockReturnValue(false);
		createSenderMempool.mockReturnValueOnce(senderMempool1);

		const senderMempool2 = {
			addTransaction: jest.fn(),
			isDisposable: jest.fn(),
		};
		senderMempool2.isDisposable.mockReturnValue(false);
		createSenderMempool.mockReturnValueOnce(senderMempool2);

		const transaction1 = {
			data: { senderPublicKey: Identities.PublicKey.fromPassphrase("sender1") },
			id: "transaction1-id",
		} as Crypto.ITransaction;

		const transaction2 = {
			data: { senderPublicKey: Identities.PublicKey.fromPassphrase("sender2") },
			id: "transaction2-id",
		} as Crypto.ITransaction;

		const memory = container.resolve(Mempool);
		await memory.addTransaction(transaction1);
		await memory.addTransaction(transaction2);
		const senderMempools = memory.getSenderMempools();

		expect([...senderMempools]).toEqual([senderMempool1, senderMempool2]);
	});
});

describe("Mempool.addTransaction", () => {
	it("should add transaction to sender state", async () => {
		const senderMempool = {
			addTransaction: jest.fn(),
			isDisposable: jest.fn(),
		};
		senderMempool.isDisposable.mockReturnValue(false);
		createSenderMempool.mockReturnValueOnce(senderMempool);

		const transaction = {
			data: { senderPublicKey: Identities.PublicKey.fromPassphrase("sender1") },
			id: "transaction-id",
		} as Crypto.ITransaction;

		const memory = container.resolve(Mempool);
		await memory.addTransaction(transaction);

		expect(senderMempool.addTransaction).toBeCalledWith(transaction);
		expect(logger.debug).toHaveBeenCalledTimes(1);
	});

	it("should forget sender state if it's empty even if error was thrown", async () => {
		const error = new Error("Something went horribly wrong");

		const senderMempool = {
			addTransaction: jest.fn(),
			isDisposable: jest.fn(),
		};
		senderMempool.addTransaction.mockRejectedValueOnce(error);
		senderMempool.isDisposable.mockReturnValue(true);
		createSenderMempool.mockReturnValueOnce(senderMempool);

		const transaction = {
			data: { senderPublicKey: Identities.PublicKey.fromPassphrase("sender1") },
			id: "transaction-id",
		} as Crypto.ITransaction;

		const memory = container.resolve(Mempool);
		const promise = memory.addTransaction(transaction);
		await expect(promise).rejects.toThrow(error);
		const has = memory.hasSenderMempool(transaction.data.senderPublicKey);

		expect(logger.debug).toHaveBeenCalledTimes(2);
		expect(has).toBe(false);
	});
});

describe("Mempool.removeTransaction", () => {
	it("should return empty array when removing transaction of sender that wasn't previously added", async () => {
		const transaction = {
			data: { senderPublicKey: Identities.PublicKey.fromPassphrase("sender1") },
			id: "transaction-id",
		} as Crypto.ITransaction;

		const memory = container.resolve(Mempool);
		const removedTransactions = await memory.removeTransaction(transaction.data.senderPublicKey, transaction.id);

		expect(removedTransactions).toStrictEqual([]);
	});

	it("should remove previously added transaction and return list of removed transactions", async () => {
		const transaction = {
			data: { senderPublicKey: Identities.PublicKey.fromPassphrase("sender1") },
			id: "transaction-id",
		} as Crypto.ITransaction;

		const senderMempool = {
			addTransaction: jest.fn(),
			isDisposable: jest.fn(),
			removeTransaction: jest.fn(),
		};
		senderMempool.removeTransaction.mockReturnValue([transaction]);
		senderMempool.isDisposable.mockReturnValue(false);
		createSenderMempool.mockReturnValueOnce(senderMempool);

		const memory = container.resolve(Mempool);
		await memory.addTransaction(transaction);
		const removedTransactions = await memory.removeTransaction(transaction.data.senderPublicKey, transaction.id);

		expect(senderMempool.removeTransaction).toBeCalledWith(transaction.id);
		expect(removedTransactions).toEqual([transaction]);
		expect(logger.debug).toHaveBeenCalledTimes(1);
	});

	it("should forget sender state if it's empty even if error was thrown", async () => {
		const error = new Error("Something went horribly wrong");
		const transaction = {
			data: { senderPublicKey: Identities.PublicKey.fromPassphrase("sender1") },
			id: "transaction-id",
		} as Crypto.ITransaction;

		const senderMempool = {
			addTransaction: jest.fn(),
			isDisposable: jest.fn(),
			removeTransaction: jest.fn(),
		};
		senderMempool.removeTransaction.mockRejectedValueOnce(error);
		senderMempool.isDisposable.mockReturnValueOnce(false).mockReturnValueOnce(true);
		createSenderMempool.mockReturnValueOnce(senderMempool);

		const memory = container.resolve(Mempool);
		await memory.addTransaction(transaction);
		const promise = memory.removeTransaction(transaction.data.senderPublicKey, transaction.id);
		await expect(promise).rejects.toThrow(error);
		const has = memory.hasSenderMempool(transaction.data.senderPublicKey);

		expect(logger.debug).toHaveBeenCalledTimes(2);
		expect(has).toBe(false);
	});
});

describe("Mempool.removeForgedTransaction", () => {
	it("should return empty array when accepting transaction of sender that wasn't previously added", async () => {
		const memory = container.resolve(Mempool);
		const removedTransactions = await memory.removeForgedTransaction(
			Identities.PublicKey.fromPassphrase("sender1"),
			"none",
		);

		expect(removedTransactions).toStrictEqual([]);
	});

	it("should remove previously added transaction and return list of removed transactions", async () => {
		const transaction = {
			data: { senderPublicKey: Identities.PublicKey.fromPassphrase("sender1") },
			id: "transaction-id",
		} as Crypto.ITransaction;

		const senderMempool = {
			addTransaction: jest.fn(),
			isDisposable: jest.fn(),
			removeForgedTransaction: jest.fn(),
		};
		senderMempool.removeForgedTransaction.mockReturnValue([transaction]);
		senderMempool.isDisposable.mockReturnValue(false);
		createSenderMempool.mockReturnValueOnce(senderMempool);

		const memory = container.resolve(Mempool);
		await memory.addTransaction(transaction);
		const removedTransactions = await memory.removeForgedTransaction(
			transaction.data.senderPublicKey,
			transaction.id,
		);

		expect(senderMempool.removeForgedTransaction).toBeCalledWith(transaction.id);
		expect(removedTransactions).toEqual([transaction]);
		expect(logger.debug).toHaveBeenCalledTimes(1);
	});

	it("should forget sender state if it's empty even if error was thrown", async () => {
		const error = new Error("Something went horribly wrong");
		const transaction = {
			data: { senderPublicKey: Identities.PublicKey.fromPassphrase("sender1") },
			id: "transaction-id",
		} as Crypto.ITransaction;

		const senderMempool = {
			addTransaction: jest.fn(),
			isDisposable: jest.fn(),
			removeForgedTransaction: jest.fn(),
		};
		senderMempool.removeForgedTransaction.mockRejectedValueOnce(error);
		senderMempool.isDisposable.mockReturnValueOnce(false).mockReturnValueOnce(true);
		createSenderMempool.mockReturnValueOnce(senderMempool);

		const memory = container.resolve(Mempool);
		await memory.addTransaction(transaction);
		const promise = memory.removeForgedTransaction(transaction.data.senderPublicKey, transaction.id);
		await expect(promise).rejects.toThrow(error);
		const has = memory.hasSenderMempool(transaction.data.senderPublicKey);

		expect(logger.debug).toHaveBeenCalledTimes(2);
		expect(has).toBe(false);
	});
});

describe("Mempool.flush", () => {
	it("should remove all sender states", async () => {
		const senderMempool = {
			addTransaction: jest.fn(),
			isDisposable: jest.fn(),
		};
		senderMempool.isDisposable.mockReturnValue(false);
		createSenderMempool.mockReturnValueOnce(senderMempool);

		const transaction = {
			data: { senderPublicKey: Identities.PublicKey.fromPassphrase("sender1") },
			id: "transaction-id",
		} as Crypto.ITransaction;

		const memory = container.resolve(Mempool);
		await memory.addTransaction(transaction);
		memory.flush();
		const has = memory.hasSenderMempool(transaction.data.senderPublicKey);

		expect(has).toBe(false);
	});
});
