import { Container } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Configuration } from "@mainsail/crypto-config";

import { describe } from "../../test-framework";
import { ExpirationService } from ".";

describe<{
	app: any;
	configuration: any;
	stateStore: any;
	stateService: any;
	container: Container;
	config: Configuration;
}>("ExpirationService", ({ it, assert, stub, beforeAll }) => {
	beforeAll((context) => {
		context.configuration = { getRequired: () => {} };
		context.stateStore = { getLastHeight: () => {} };
		context.stateService = { getStateStore: () => context.stateStore };
		context.app = { get: () => {} };

		context.container = new Container();
		context.container.bind(Identifiers.Application.Instance).toConstantValue(context.app);
		context.container.bind(Identifiers.ServiceProvider.Configuration).toConstantValue(context.configuration);
		context.container.bind(Identifiers.State.Service).toConstantValue(context.stateService);
		context.container.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();

		context.config = context.container.get(Identifiers.Cryptography.Configuration);
	});

	it("canExpire - should return false when checking v2 transaction with 0 expiration", (context) => {
		const transaction = { data: { expiration: 0 } } as Contracts.Crypto.Transaction;
		const expirationService = context.container.resolve(ExpirationService);
		const result = expirationService.canExpire(transaction);

		assert.false(result);
	});

	it("canExpire - should return true when checking v2 transaction with expiration field", (context) => {
		const transaction = { data: { expiration: 100 } } as Contracts.Crypto.Transaction;
		const expirationService = context.container.resolve(ExpirationService);
		const result = expirationService.canExpire(transaction);

		assert.true(result);
	});

	it("canExpire - should return false when checking v2 transaction without expiration field", (context) => {
		const transaction = { data: {} } as Contracts.Crypto.Transaction;
		const expirationService = context.container.resolve(ExpirationService);
		const result = expirationService.canExpire(transaction);

		assert.false(result);
	});

	it("isExpired - should always return false when checking v2 transaction without expiration field", async (context) => {
		const transaction = { data: {} } as Contracts.Crypto.Transaction;
		const expirationService = context.container.resolve(ExpirationService);
		const expired = await expirationService.isExpired(transaction);

		assert.false(expired);
	});

	it("isExpired - should return true if transaction expired when checking v2 transaction with expiration field", async (context) => {
		stub(context.stateStore, "getLastHeight").returnValue(100);

		const transaction = { data: { expiration: 50 } } as Contracts.Crypto.Transaction;
		const expirationService = context.container.resolve(ExpirationService);
		const expired = await expirationService.isExpired(transaction);

		assert.true(expired);
	});

	it("isExpired - should return false if transaction not expired when checking v2 transaction with expiration field", async (context) => {
		stub(context.stateStore, "getLastHeight").returnValue(100);

		const transaction = { data: { expiration: 150 } } as Contracts.Crypto.Transaction;
		const expirationService = context.container.resolve(ExpirationService);
		const expired = await expirationService.isExpired(transaction);

		assert.false(expired);
	});

	it("isExpired - should return true if transaction expires in next block when checking v2 transaciton with expiration field", async (context) => {
		stub(context.stateStore, "getLastHeight").returnValue(100);

		const transaction = { data: { expiration: 101 } } as Contracts.Crypto.Transaction;
		const expirationService = context.container.resolve(ExpirationService);
		const expired = await expirationService.isExpired(transaction);

		assert.true(expired);
	});

	it("getExpirationHeight - should throw when checking v2 transaction without expiration field", async (context) => {
		const transaction = { data: {} } as Contracts.Crypto.Transaction;
		const expirationService = context.container.resolve(ExpirationService);
		const check = async () => await expirationService.getExpirationHeight(transaction);

		await assert.rejects(check);
	});

	it("getExpirationHeight - should return value stored in expiration field when checking v2 transaction with expiration field", async (context) => {
		const transaction = { data: { expiration: 100 } } as Contracts.Crypto.Transaction;
		const expirationService = context.container.resolve(ExpirationService);
		const expirationHeight = await expirationService.getExpirationHeight(transaction);

		assert.equal(expirationHeight, 100);
	});
});
