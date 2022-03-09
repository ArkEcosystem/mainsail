import { Container, Utils } from "@arkecosystem/core-kernel";
import { describe } from "@arkecosystem/core-test-framework";
import { Crypto, Interfaces, Managers } from "@arkecosystem/crypto";

import { ExpirationService } from ".";

describe<{
	app: any;
	configuration: any;
	stateStore: any;
	container: Container.Container;
}>("ExpirationService", ({ it, assert, stub, beforeAll, beforeEach }) => {
	beforeAll((context) => {
		context.configuration = { getRequired: () => {} };
		context.stateStore = { getLastHeight: () => {} };
		context.app = { get: () => {} };

		context.container = new Container.Container();
		context.container.bind(Container.Identifiers.Application).toConstantValue(context.app);
		context.container.bind(Container.Identifiers.PluginConfiguration).toConstantValue(context.configuration);
		context.container.bind(Container.Identifiers.StateStore).toConstantValue(context.stateStore);
	});

	beforeEach(() => {
		const getTimeStampForBlock = (height: number) => {
			switch (height) {
				case 1:
					return 0;
				default:
					throw new Error(`Test scenarios should not hit this line`);
			}
		};

		stub(Utils.forgingInfoCalculator, "getBlockTimeLookup").resolvedValue(getTimeStampForBlock);
	});

	it("canExpire - should return true when checking v1 transaction", (context) => {
		const transaction = { data: { timestamp: 3600 } } as Interfaces.ITransaction;
		const expirationService = context.container.resolve(ExpirationService);
		const result = expirationService.canExpire(transaction);

		assert.true(result);
	});

	it("canExpire - should return false when checking v2 transaction with 0 expiration", (context) => {
		const transaction = { data: { expiration: 0, version: 2 } } as Interfaces.ITransaction;
		const expirationService = context.container.resolve(ExpirationService);
		const result = expirationService.canExpire(transaction);

		assert.false(result);
	});

	it("canExpire - should return true when checking v2 transaction with expiration field", (context) => {
		const transaction = { data: { expiration: 100, version: 2 } } as Interfaces.ITransaction;
		const expirationService = context.container.resolve(ExpirationService);
		const result = expirationService.canExpire(transaction);

		assert.true(result);
	});

	it("canExpire - should return false when checking v2 transaction without expiration field", (context) => {
		const transaction = { data: { version: 2 } } as Interfaces.ITransaction;
		const expirationService = context.container.resolve(ExpirationService);
		const result = expirationService.canExpire(transaction);

		assert.false(result);
	});

	it("isExpired - should always return false when checking v2 transaction without expiration field", async (context) => {
		const transaction = { data: { version: 2 } } as Interfaces.ITransaction;
		const expirationService = context.container.resolve(ExpirationService);
		const expired = await expirationService.isExpired(transaction);

		assert.false(expired);
	});

	it("isExpired - should return true if transaction expired when checking v2 transaction with expiration field", async (context) => {
		stub(context.stateStore, "getLastHeight").returnValue(100);

		const transaction = { data: { expiration: 50, version: 2 } } as Interfaces.ITransaction;
		const expirationService = context.container.resolve(ExpirationService);
		const expired = await expirationService.isExpired(transaction);

		assert.true(expired);
	});

	it("isExpired - should return false if transaction not expired when checking v2 transaction with expiration field", async (context) => {
		stub(context.stateStore, "getLastHeight").returnValue(100);

		const transaction = { data: { expiration: 150, version: 2 } } as Interfaces.ITransaction;
		const expirationService = context.container.resolve(ExpirationService);
		const expired = await expirationService.isExpired(transaction);

		assert.false(expired);
	});

	it("isExpired - should return true if transaction expires in next block when checking v2 transaciton with expiration field", async (context) => {
		stub(context.stateStore, "getLastHeight").returnValue(100);

		const transaction = { data: { expiration: 101, version: 2 } } as Interfaces.ITransaction;
		const expirationService = context.container.resolve(ExpirationService);
		const expired = await expirationService.isExpired(transaction);

		assert.true(expired);
	});

	it("isExpired - should return true if transaction expired when checking v1 transaction", async (context) => {
		stub(Managers.configManager, "get").returnValue([{ blockTime: 60, height: 1 }]);
		stub(Crypto.Slots, "getTime").returnValue(60 * 180);

		stub(context.configuration, "getRequired").returnValue(60);
		stub(context.stateStore, "getLastHeight").returnValue(180);

		const transaction = { data: { timestamp: 3600 } } as Interfaces.ITransaction;
		const expirationService = context.container.resolve(ExpirationService);
		const expired = await expirationService.isExpired(transaction);

		assert.true(expired);
	});

	it("isExpired - should return false if transaction not expired when checking v1 transaction", async (context) => {
		stub(Managers.configManager, "get").returnValue([{ blockTime: 60, height: 1 }]);
		stub(Crypto.Slots, "getTime").returnValue(60 * 100);

		stub(context.configuration, "getRequired").returnValue(60);
		stub(context.stateStore, "getLastHeight").returnValue(100);

		const transaction = { data: { timestamp: 3600 } } as Interfaces.ITransaction;
		const expirationService = context.container.resolve(ExpirationService);
		const expired = await expirationService.isExpired(transaction);

		assert.false(expired);
	});

	it("getExpirationHeight - should throw when checking v2 transaction without expiration field", async (context) => {
		const transaction = { data: { version: 2 } } as Interfaces.ITransaction;
		const expirationService = context.container.resolve(ExpirationService);
		const check = async () => await expirationService.getExpirationHeight(transaction);

		await assert.rejects(check);
	});

	it("getExpirationHeight - should return value stored in expiration field when checking v2 transaction with expiration field", async (context) => {
		const transaction = { data: { expiration: 100, version: 2 } } as Interfaces.ITransaction;
		const expirationService = context.container.resolve(ExpirationService);
		const expirationHeight = await expirationService.getExpirationHeight(transaction);

		assert.equal(expirationHeight, 100);
	});

	it("getExpirationHeight - should calculate expiration height when checking v1 transaction", async (context) => {
		stub(Managers.configManager, "get").returnValue([{ blockTime: 60, height: 1 }]);
		stub(Crypto.Slots, "getTime").returnValue(60 * 120);

		stub(context.configuration, "getRequired").returnValue(60);
		stub(context.stateStore, "getLastHeight").returnValue(120);

		const transaction = { data: { timestamp: 3600 } } as Interfaces.ITransaction;
		const expirationService = context.container.resolve(ExpirationService);
		const expirationHeight = await expirationService.getExpirationHeight(transaction);

		assert.equal(expirationHeight, 120);
	});
});
