import { Container } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Configuration } from "@arkecosystem/core-crypto-config";
import { BlockTimeCalculator } from "@arkecosystem/core-crypto-time/source/block-time-calculator";
import { Slots } from "@arkecosystem/core-crypto-time/source/slots";

import { describe } from "../../core-test-framework";
import { ExpirationService } from ".";

describe<{
	app: any;
	configuration: any;
	stateStore: any;
	container: Container;
	config: Configuration;
	slots: Slots;
}>("ExpirationService", ({ it, assert, stub, beforeAll }) => {
	beforeAll((context) => {
		context.configuration = { getRequired: () => {} };
		context.stateStore = { getLastHeight: () => {} };
		context.app = { get: () => {} };

		context.container = new Container();
		context.container.bind(Identifiers.Application).toConstantValue(context.app);
		context.container.bind(Identifiers.PluginConfiguration).toConstantValue(context.configuration);
		context.container.bind(Identifiers.StateStore).toConstantValue(context.stateStore);
		context.container.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
		context.container.bind(Identifiers.Cryptography.Time.BlockTimeLookup).toConstantValue({
			getBlockTimeLookup: (height: number) => {
				switch (height) {
					case 1:
						return 0;
					default:
						throw new Error(`Test scenarios should not hit this line`);
				}
			},
		});

		context.container
			.bind(Identifiers.Cryptography.Time.BlockTimeCalculator)
			.to(BlockTimeCalculator)
			.inSingletonScope();

		context.config = context.container.get(Identifiers.Cryptography.Configuration);
		context.slots = context.container.resolve(Slots);
	});

	it("canExpire - should return false when checking v2 transaction with 0 expiration", (context) => {
		const transaction = { data: { expiration: 0 } } as Contracts.Crypto.ITransaction;
		const expirationService = context.container.resolve(ExpirationService);
		const result = expirationService.canExpire(transaction);

		assert.false(result);
	});

	it("canExpire - should return true when checking v2 transaction with expiration field", (context) => {
		const transaction = { data: { expiration: 100 } } as Contracts.Crypto.ITransaction;
		const expirationService = context.container.resolve(ExpirationService);
		const result = expirationService.canExpire(transaction);

		assert.true(result);
	});

	it("canExpire - should return false when checking v2 transaction without expiration field", (context) => {
		const transaction = { data: {} } as Contracts.Crypto.ITransaction;
		const expirationService = context.container.resolve(ExpirationService);
		const result = expirationService.canExpire(transaction);

		assert.false(result);
	});

	it("isExpired - should always return false when checking v2 transaction without expiration field", async (context) => {
		const transaction = { data: {} } as Contracts.Crypto.ITransaction;
		const expirationService = context.container.resolve(ExpirationService);
		const expired = await expirationService.isExpired(transaction);

		assert.false(expired);
	});

	it("isExpired - should return true if transaction expired when checking v2 transaction with expiration field", async (context) => {
		stub(context.stateStore, "getLastHeight").returnValue(100);

		const transaction = { data: { expiration: 50 } } as Contracts.Crypto.ITransaction;
		const expirationService = context.container.resolve(ExpirationService);
		const expired = await expirationService.isExpired(transaction);

		assert.true(expired);
	});

	it("isExpired - should return false if transaction not expired when checking v2 transaction with expiration field", async (context) => {
		stub(context.stateStore, "getLastHeight").returnValue(100);

		const transaction = { data: { expiration: 150 } } as Contracts.Crypto.ITransaction;
		const expirationService = context.container.resolve(ExpirationService);
		const expired = await expirationService.isExpired(transaction);

		assert.false(expired);
	});

	it("isExpired - should return true if transaction expires in next block when checking v2 transaciton with expiration field", async (context) => {
		stub(context.stateStore, "getLastHeight").returnValue(100);

		const transaction = { data: { expiration: 101 } } as Contracts.Crypto.ITransaction;
		const expirationService = context.container.resolve(ExpirationService);
		const expired = await expirationService.isExpired(transaction);

		assert.true(expired);
	});

	it("getExpirationHeight - should throw when checking v2 transaction without expiration field", async (context) => {
		const transaction = { data: {} } as Contracts.Crypto.ITransaction;
		const expirationService = context.container.resolve(ExpirationService);
		const check = async () => await expirationService.getExpirationHeight(transaction);

		await assert.rejects(check);
	});

	it("getExpirationHeight - should return value stored in expiration field when checking v2 transaction with expiration field", async (context) => {
		const transaction = { data: { expiration: 100 } } as Contracts.Crypto.ITransaction;
		const expirationService = context.container.resolve(ExpirationService);
		const expirationHeight = await expirationService.getExpirationHeight(transaction);

		assert.equal(expirationHeight, 100);
	});
});
