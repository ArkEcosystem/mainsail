import { Container } from "@arkecosystem/core-container";
import { Identifiers } from "@arkecosystem/core-contracts";
import { Application, Services } from "@arkecosystem/core-kernel";
import importFresh from "import-fresh";
import { AnySchema } from "joi";

import { describe } from "../../core-test-framework";
import { ServiceProvider } from ".";

const importDefaults = () =>
	// @ts-ignore
	importFresh("../distribution/defaults.js").defaults;

const removeTransactionPoolEnvironmentVariables = () => {
	for (const key of Object.keys(process.env)) {
		if (key.includes("CORE_TRANSACTION_POOL") || key === "CORE_MAX_TRANSACTIONS_IN_POOL") {
			delete process.env[key];
		}
	}
};

describe<{
	app: Application;
	serviceProvider: ServiceProvider;
	txPoolEnv: any;
	maxTxPoolEnv: any;
}>("ServiceProvider", ({ it, assert, beforeEach, afterEach, stub }) => {
	beforeEach((context) => {
		context.app = new Application(new Container());
		context.app.bind(Identifiers.TriggerService).to(Services.Triggers.Triggers).inSingletonScope();

		context.txPoolEnv = process.env.CORE_TRANSACTION_POOL;
		context.maxTxPoolEnv = process.env.CORE_MAX_TRANSACTIONS_IN_POOL;

		context.serviceProvider = context.app.resolve(ServiceProvider);
	});

	afterEach((context) => {
		process.env.CORE_TRANSACTION_POOL = context.txPoolEnv;
		process.env.CORE_MAX_TRANSACTIONS_IN_POOL = context.maxTxPoolEnv;
	});

	it("should register, boot and dispose", async (context) => {
		await assert.resolves(() => context.serviceProvider.register());

		context.app.rebind(Identifiers.TransactionPoolStorage).toConstantValue({
			boot: () => {},
			dispose: () => {},
		});

		context.app.rebind(Identifiers.TransactionPoolService).toConstantValue({
			boot: () => {},
			dispose: () => {},
		});

		await assert.resolves(() => context.serviceProvider.boot());
		await assert.resolves(() => context.serviceProvider.dispose());
	});

	it("should be required", async (context) => {
		const promise = context.serviceProvider.required();

		await assert.resolves(() => promise);

		promise.then((res) => {
			assert.true(res);
		});
	});

	it("should validate schema using defaults", async (context) => {
		removeTransactionPoolEnvironmentVariables();

		const result = (context.serviceProvider.configSchema() as AnySchema).validate(importDefaults());

		assert.undefined(result.error);

		assert.true(result.value.enabled);
		assert.string(result.value.storage);
		assert.number(result.value.maxTransactionsInPool);
		assert.number(result.value.maxTransactionsPerSender);
		assert.equal(result.value.allowedSenders, []);
		assert.number(result.value.maxTransactionsPerRequest);
		assert.number(result.value.maxTransactionAge);
		assert.number(result.value.maxTransactionBytes);
	});

	it("should allow configuration extension", async (context) => {
		removeTransactionPoolEnvironmentVariables();

		const defaults = importDefaults();

		defaults.customField = "dummy";

		const result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.undefined(result.error);
		assert.equal(result.value.customField, "dummy");
	});

	it("should return true when process.env.CORE_TRANSACTION_POOL_DISABLED is undefined", async (context) => {
		removeTransactionPoolEnvironmentVariables();

		const result = (context.serviceProvider.configSchema() as AnySchema).validate(importDefaults());

		assert.undefined(result.error);
		assert.true(result.value.enabled);
	});

	it("should return false when process.env.CORE_TRANSACTION_POOL_DISABLED is present", async (context) => {
		removeTransactionPoolEnvironmentVariables();

		process.env.CORE_TRANSACTION_POOL_DISABLED = "true";

		const result = (context.serviceProvider.configSchema() as AnySchema).validate(importDefaults());

		assert.undefined(result.error);
		assert.false(result.value.enabled);
	});

	it("should return path containing process.env.CORE_PATH_DATA", async (context) => {
		removeTransactionPoolEnvironmentVariables();

		process.env.CORE_PATH_DATA = "dummy/path";

		const result = (context.serviceProvider.configSchema() as AnySchema).validate(importDefaults());

		assert.undefined(result.error);
		assert.equal(result.value.storage, "dummy/path/transaction-pool.sqlite");
	});

	it("should parse process.env.CORE_MAX_TRANSACTIONS_IN_POOL", async (context) => {
		removeTransactionPoolEnvironmentVariables();

		process.env.CORE_MAX_TRANSACTIONS_IN_POOL = "4000";

		const result = (context.serviceProvider.configSchema() as AnySchema).validate(importDefaults());

		assert.undefined(result.error);
		assert.equal(result.value.maxTransactionsInPool, 4000);
	});

	it("should throw if process.env.CORE_MAX_TRANSACTIONS_IN_POOL is not number", async (context) => {
		removeTransactionPoolEnvironmentVariables();

		process.env.CORE_MAX_TRANSACTIONS_IN_POOL = "false";

		const result = (context.serviceProvider.configSchema() as AnySchema).validate(importDefaults());

		assert.defined(result.error);
		assert.equal(result.error.message, '"maxTransactionsInPool" must be a number');
	});

	it("should parse process.env.CORE_TRANSACTION_POOL_MAX_PER_SENDER", async (context) => {
		removeTransactionPoolEnvironmentVariables();

		process.env.CORE_TRANSACTION_POOL_MAX_PER_SENDER = "4000";

		const result = (context.serviceProvider.configSchema() as AnySchema).validate(importDefaults());

		assert.undefined(result.error);
		assert.equal(result.value.maxTransactionsPerSender, 4000);
	});

	it("should throw if process.env.CORE_TRANSACTION_POOL_MAX_PER_SENDER is not number", async (context) => {
		removeTransactionPoolEnvironmentVariables();

		process.env.CORE_TRANSACTION_POOL_MAX_PER_SENDER = "false";

		const result = (context.serviceProvider.configSchema() as AnySchema).validate(importDefaults());

		assert.defined(result.error);
		assert.equal(result.error.message, '"maxTransactionsPerSender" must be a number');
	});

	it("should parse process.env.CORE_TRANSACTION_POOL_MAX_PER_SENDER", async (context) => {
		removeTransactionPoolEnvironmentVariables();

		process.env.CORE_TRANSACTION_POOL_MAX_PER_REQUEST = "4000";

		const result = (context.serviceProvider.configSchema() as AnySchema).validate(importDefaults());

		assert.undefined(result.error);
		assert.equal(result.value.maxTransactionsPerRequest, 4000);
	});

	it("should throw if process.env.CORE_TRANSACTION_POOL_MAX_PER_REQUEST is not number", async (context) => {
		removeTransactionPoolEnvironmentVariables();

		process.env.CORE_TRANSACTION_POOL_MAX_PER_REQUEST = "false";

		const result = (context.serviceProvider.configSchema() as AnySchema).validate(importDefaults());

		assert.defined(result.error);
		assert.equal(result.error.message, '"maxTransactionsPerRequest" must be a number');
	});

	it("schema restrictions - enabled is required", async (context) => {
		removeTransactionPoolEnvironmentVariables();
		const defaults = importDefaults();

		delete defaults.enabled;
		const result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error.message, '"enabled" is required');
	});

	it("schema restrictions - storage is required", async (context) => {
		removeTransactionPoolEnvironmentVariables();

		const defaults = importDefaults();

		delete defaults.storage;
		const result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error.message, '"storage" is required');
	});

	it("schema restrictions - maxTransactionsInPool is required && is integer && >= 1", async (context) => {
		removeTransactionPoolEnvironmentVariables();

		const defaults = importDefaults();

		defaults.maxTransactionsInPool = false;
		let result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error.message, '"maxTransactionsInPool" must be a number');

		defaults.maxTransactionsInPool = 1.12;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error.message, '"maxTransactionsInPool" must be an integer');

		defaults.maxTransactionsInPool = 0;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error.message, '"maxTransactionsInPool" must be greater than or equal to 1');

		delete defaults.maxTransactionsInPool;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error.message, '"maxTransactionsInPool" is required');
	});

	it("schema restrictions - maxTransactionsPerSender is required && is integer && >= 1", async (context) => {
		removeTransactionPoolEnvironmentVariables();

		const defaults = importDefaults();

		defaults.maxTransactionsPerSender = false;
		let result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error.message, '"maxTransactionsPerSender" must be a number');

		defaults.maxTransactionsPerSender = 1.12;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error.message, '"maxTransactionsPerSender" must be an integer');

		defaults.maxTransactionsPerSender = 0;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error.message, '"maxTransactionsPerSender" must be greater than or equal to 1');

		delete defaults.maxTransactionsPerSender;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error.message, '"maxTransactionsPerSender" is required');
	});

	it("schema restrictions - allowedSenders is required && must contain strings", async (context) => {
		removeTransactionPoolEnvironmentVariables();

		const defaults = importDefaults();

		delete defaults.allowedSenders;
		let result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error.message, '"allowedSenders" is required');

		defaults.allowedSenders = [1, 2];
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error.message, '"allowedSenders[0]" must be a string');
	});

	it("schema restrictions - maxTransactionsPerRequest is required && is integer && >= 1", async (context) => {
		removeTransactionPoolEnvironmentVariables();

		const defaults = importDefaults();

		defaults.maxTransactionsPerRequest = false;
		let result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error.message, '"maxTransactionsPerRequest" must be a number');

		defaults.maxTransactionsPerRequest = 1.12;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error.message, '"maxTransactionsPerRequest" must be an integer');

		defaults.maxTransactionsPerRequest = 0;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error.message, '"maxTransactionsPerRequest" must be greater than or equal to 1');

		delete defaults.maxTransactionsPerRequest;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error.message, '"maxTransactionsPerRequest" is required');
	});

	it("schema restrictions - maxTransactionAge is required && is integer && >= 1", async (context) => {
		removeTransactionPoolEnvironmentVariables();

		const defaults = importDefaults();

		defaults.maxTransactionAge = false;
		let result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error.message, '"maxTransactionAge" must be a number');

		defaults.maxTransactionAge = 1.12;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error.message, '"maxTransactionAge" must be an integer');

		defaults.maxTransactionAge = 0;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error.message, '"maxTransactionAge" must be greater than or equal to 1');

		delete defaults.maxTransactionAge;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error.message, '"maxTransactionAge" is required');
	});

	it("schema restrictions - maxTransactionBytes is required && is integer && >= 1", async (context) => {
		removeTransactionPoolEnvironmentVariables();

		const defaults = importDefaults();

		defaults.maxTransactionBytes = false;
		let result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error.message, '"maxTransactionBytes" must be a number');

		defaults.maxTransactionBytes = 1.12;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error.message, '"maxTransactionBytes" must be an integer');

		defaults.maxTransactionBytes = 0;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error.message, '"maxTransactionBytes" must be greater than or equal to 1');

		delete defaults.maxTransactionBytes;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error.message, '"maxTransactionBytes" is required');
	});
});
