import { Application, Container, Contracts, Services } from "@arkecosystem/core-kernel";
import { ServiceProvider } from "./";
import child_process from "child_process";
import { AnySchema } from "joi";
import { describe } from "@arkecosystem/core-test-framework";
import importFresh from "import-fresh";

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
		context.app = new Application(new Container.Container());
		context.app.bind(Container.Identifiers.TriggerService).to(Services.Triggers.Triggers).inSingletonScope();

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

		context.app.rebind(Container.Identifiers.TransactionPoolStorage).toConstantValue({
			boot: () => undefined,
			dispose: () => undefined,
		});

		context.app.rebind(Container.Identifiers.TransactionPoolService).toConstantValue({
			boot: () => undefined,
			dispose: () => undefined,
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

	it("should provide TransactionPoolWorkerIpcSubprocessFactory", async (context) => {
		await assert.resolves(() => context.serviceProvider.register());

		const subprocessFactory = context.app.get<Contracts.TransactionPool.WorkerIpcSubprocessFactory>(
			Container.Identifiers.TransactionPoolWorkerIpcSubprocessFactory,
		);

		const forkStub = stub(child_process, "fork").returnValueOnce({
			on: () => undefined,
		});

		subprocessFactory();

		forkStub.called();
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

		assert.true(result.value.dynamicFees.enabled);
		assert.number(result.value.dynamicFees.minFeePool);
		assert.number(result.value.dynamicFees.minFeeBroadcast);

		assert.number(result.value.dynamicFees.addonBytes.transfer);
		assert.number(result.value.dynamicFees.addonBytes.delegateRegistration);
		assert.number(result.value.dynamicFees.addonBytes.vote);
		assert.number(result.value.dynamicFees.addonBytes.multiSignature);
		assert.number(result.value.dynamicFees.addonBytes.multiPayment);
		assert.number(result.value.dynamicFees.addonBytes.delegateResignation);

		assert.number(result.value.workerPool.workerCount);
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
		assert.equal(result.error!.message, '"maxTransactionsInPool" must be a number');
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
		assert.equal(result.error!.message, '"maxTransactionsPerSender" must be a number');
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
		assert.equal(result.error!.message, '"maxTransactionsPerRequest" must be a number');
	});

	it("schema restrictions - enabled is required", async (context) => {
		removeTransactionPoolEnvironmentVariables();
		const defaults = importDefaults();

		delete defaults.enabled;
		const result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"enabled" is required');
	});

	it("schema restrictions - storage is required", async (context) => {
		removeTransactionPoolEnvironmentVariables();

		const defaults = importDefaults();

		delete defaults.storage;
		const result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"storage" is required');
	});

	it("schema restrictions - maxTransactionsInPool is required && is integer && >= 1", async (context) => {
		removeTransactionPoolEnvironmentVariables();

		const defaults = importDefaults();

		defaults.maxTransactionsInPool = false;
		let result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"maxTransactionsInPool" must be a number');

		defaults.maxTransactionsInPool = 1.12;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"maxTransactionsInPool" must be an integer');

		defaults.maxTransactionsInPool = 0;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"maxTransactionsInPool" must be greater than or equal to 1');

		delete defaults.maxTransactionsInPool;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"maxTransactionsInPool" is required');
	});

	it("schema restrictions - maxTransactionsPerSender is required && is integer && >= 1", async (context) => {
		removeTransactionPoolEnvironmentVariables();

		const defaults = importDefaults();

		defaults.maxTransactionsPerSender = false;
		let result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"maxTransactionsPerSender" must be a number');

		defaults.maxTransactionsPerSender = 1.12;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"maxTransactionsPerSender" must be an integer');

		defaults.maxTransactionsPerSender = 0;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"maxTransactionsPerSender" must be greater than or equal to 1');

		delete defaults.maxTransactionsPerSender;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"maxTransactionsPerSender" is required');
	});

	it("schema restrictions - allowedSenders is required && must contain strings", async (context) => {
		removeTransactionPoolEnvironmentVariables();

		const defaults = importDefaults();

		delete defaults.allowedSenders;
		let result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"allowedSenders" is required');

		defaults.allowedSenders = [1, 2];
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"allowedSenders[0]" must be a string');
	});

	it("schema restrictions - maxTransactionsPerRequest is required && is integer && >= 1", async (context) => {
		removeTransactionPoolEnvironmentVariables();

		const defaults = importDefaults();

		defaults.maxTransactionsPerRequest = false;
		let result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"maxTransactionsPerRequest" must be a number');

		defaults.maxTransactionsPerRequest = 1.12;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"maxTransactionsPerRequest" must be an integer');

		defaults.maxTransactionsPerRequest = 0;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"maxTransactionsPerRequest" must be greater than or equal to 1');

		delete defaults.maxTransactionsPerRequest;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"maxTransactionsPerRequest" is required');
	});

	it("schema restrictions - maxTransactionAge is required && is integer && >= 1", async (context) => {
		removeTransactionPoolEnvironmentVariables();

		const defaults = importDefaults();

		defaults.maxTransactionAge = false;
		let result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"maxTransactionAge" must be a number');

		defaults.maxTransactionAge = 1.12;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"maxTransactionAge" must be an integer');

		defaults.maxTransactionAge = 0;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"maxTransactionAge" must be greater than or equal to 1');

		delete defaults.maxTransactionAge;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"maxTransactionAge" is required');
	});

	it("schema restrictions - maxTransactionBytes is required && is integer && >= 1", async (context) => {
		removeTransactionPoolEnvironmentVariables();

		const defaults = importDefaults();

		defaults.maxTransactionBytes = false;
		let result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"maxTransactionBytes" must be a number');

		defaults.maxTransactionBytes = 1.12;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"maxTransactionBytes" must be an integer');

		defaults.maxTransactionBytes = 0;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"maxTransactionBytes" must be greater than or equal to 1');

		delete defaults.maxTransactionBytes;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"maxTransactionBytes" is required');
	});

	it("schema restrictions - dynamicFees is required", async (context) => {
		removeTransactionPoolEnvironmentVariables();

		const defaults = importDefaults();

		delete defaults.dynamicFees;
		const result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"dynamicFees" is required');
	});

	it("schema restrictions - dynamicFees.enabled is required", async (context) => {
		removeTransactionPoolEnvironmentVariables();

		const defaults = importDefaults();

		delete defaults.dynamicFees.enabled;
		const result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"dynamicFees.enabled" is required');
	});

	it("schema restrictions - dynamicFees.minFeePool is required when enabled = true && is integer && >= 0", async (context) => {
		removeTransactionPoolEnvironmentVariables();

		const defaults = importDefaults();

		defaults.dynamicFees.minFeePool = false;
		let result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"dynamicFees.minFeePool" must be a number');

		defaults.dynamicFees.minFeePool = 1.12;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"dynamicFees.minFeePool" must be an integer');

		defaults.dynamicFees.minFeePool = -1;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"dynamicFees.minFeePool" must be greater than or equal to 0');

		delete defaults.dynamicFees.minFeePool;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"dynamicFees.minFeePool" is required');

		defaults.dynamicFees.enabled = false;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.undefined(result.error);
	});

	it("schema restrictions - dynamicFees.minFeeBroadcast is required when enabled = true && must be larger or equal 0", async (context) => {
		removeTransactionPoolEnvironmentVariables();

		const defaults = importDefaults();

		defaults.dynamicFees.minFeeBroadcast = false;
		let result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"dynamicFees.minFeeBroadcast" must be a number');

		defaults.dynamicFees.minFeeBroadcast = 1.12;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"dynamicFees.minFeeBroadcast" must be an integer');

		defaults.dynamicFees.minFeeBroadcast = -1;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"dynamicFees.minFeeBroadcast" must be greater than or equal to 0');

		delete defaults.dynamicFees.minFeeBroadcast;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"dynamicFees.minFeeBroadcast" is required');

		defaults.dynamicFees.enabled = false;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.undefined(result.error);
	});

	it("schema restrictions - dynamicFees.addonBytes is required when enabled = true", async (context) => {
		removeTransactionPoolEnvironmentVariables();

		const defaults = importDefaults();

		delete defaults.dynamicFees.addonBytes;
		let result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"dynamicFees.addonBytes" is required');

		defaults.dynamicFees.enabled = false;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.undefined(result.error);
	});

	it("schema restrictions - dynamicFees.addonBytes[transaction_name] should be integer && >= 0 when present", async (context) => {
		removeTransactionPoolEnvironmentVariables();

		const defaults = importDefaults();

		defaults.dynamicFees.addonBytes.test = false;
		let result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"dynamicFees.addonBytes.test" must be a number');

		defaults.dynamicFees.addonBytes.test = 1.12;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"dynamicFees.addonBytes.test" must be an integer');

		defaults.dynamicFees.addonBytes.test = -1;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"dynamicFees.addonBytes.test" must be greater than or equal to 0');
	});

	it("schema restrictions - workerPool is required", async (context) => {
		removeTransactionPoolEnvironmentVariables();

		const defaults = importDefaults();

		delete defaults.workerPool;
		const result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"workerPool" is required');
	});

	it("schema restrictions - workerPool.workerCount is required && is integer && >= 0", async (context) => {
		removeTransactionPoolEnvironmentVariables();

		const defaults = importDefaults();

		defaults.workerPool.workerCount = false;
		let result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"workerPool.workerCount" must be a number');

		defaults.workerPool.workerCount = 1.12;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"workerPool.workerCount" must be an integer');

		defaults.workerPool.workerCount = 0;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"workerPool.workerCount" must be greater than or equal to 1');

		delete defaults.workerPool.workerCount;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"workerPool.workerCount" is required');
	});
});
