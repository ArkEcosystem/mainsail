import { EnvironmentVariables, Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { SenderMempool } from "./sender-mempool";
import { ServiceProvider } from "./service-provider";

const alice = "0x75545540230d5c3BEf023202d23CB74cFA723376";
const aliceLegacy = "DH8WhBj6ron2tQhdFPQzjDcrk2CCY997MP";
const bob = "0xbbe7B35057F3431E001d2b96817e3061B59849c9";
const bobLegacy = "DQogphvhHjJsqEhhR7befFiTzHQWLrQV3d";

const importFresh = (moduleName) => import(`${moduleName}?${Date.now()}`);

const numericSettings: Record<string, string> = {
	[EnvironmentVariables.MAINSAIL_MAX_TRANSACTIONS_IN_POOL]: "maxTransactionsInPool",
	[EnvironmentVariables.MAINSAIL_TRANSACTION_POOL_MAX_PER_REQUEST]: "maxTransactionsPerRequest",
	[EnvironmentVariables.MAINSAIL_TRANSACTION_POOL_MAX_PER_SENDER]: "maxTransactionsPerSender",
	[EnvironmentVariables.MAINSAIL_TRANSACTION_POOL_REBROADCAST_COOLDOWN_BLOCKS]: "rebroadcastCooldownBlocks",
	[EnvironmentVariables.MAINSAIL_TRANSACTION_POOL_REBROADCAST_THRESHOLD]: "rebroadcastThreshold",
};

const environmentVariables = [
	...Object.keys(numericSettings),
	EnvironmentVariables.MAINSAIL_PATH_DATA,
	EnvironmentVariables.MAINSAIL_TRANSACTION_POOL_DISABLED,
];

describe<{
	app: Application;
	serviceProvider: ServiceProvider;
}>("ServiceProvider", ({ it, assert, beforeEach, spy }) => {
	beforeEach((context) => {
		context.app = new Application();

		context.serviceProvider = context.app.resolve(ServiceProvider);
	});

	it("register - should bind the transaction pool services", async ({ app, serviceProvider }) => {
		const identifiers = [
			Identifiers.TransactionPool.Mempool,
			Identifiers.TransactionPool.Processor,
			Identifiers.TransactionPool.Query,
			Identifiers.TransactionPool.Selector,
			Identifiers.TransactionPool.SenderMempool.Factory,
			Identifiers.TransactionPool.SenderState,
			Identifiers.TransactionPool.Service,
			Identifiers.TransactionPool.Storage,
		];
		assert.false(identifiers.some((identifier) => app.isBound(identifier)));

		await serviceProvider.register();

		assert.true(identifiers.every((identifier) => app.isBound(identifier)));
	});

	it("register - should bind a factory that creates a configured sender mempool per sender", async ({
		app,
		serviceProvider,
	}) => {
		await serviceProvider.register();
		const senderState = { configure: async () => {} };
		const configure = spy(senderState, "configure");
		app.bind(Identifiers.ServiceProvider.Configuration).toConstantValue({});
		app.rebind(Identifiers.TransactionPool.SenderState).toConstantValue(senderState);
		const createSenderMempool = app.get<(address: string, legacyAddress?: string) => Promise<SenderMempool>>(
			Identifiers.TransactionPool.SenderMempool.Factory,
		);

		const aliceMempool = await createSenderMempool(alice, aliceLegacy);
		const bobMempool = await createSenderMempool(bob, bobLegacy);

		assert.instance(aliceMempool, SenderMempool);
		assert.instance(bobMempool, SenderMempool);
		assert.is.not(aliceMempool, bobMempool);
		configure.calledTimes(2);
		configure.calledNthWith(0, alice, aliceLegacy);
		configure.calledNthWith(1, bob, bobLegacy);
	});

	it("boot - should boot the storage before the service", async ({ app, serviceProvider }) => {
		const calls: string[] = [];
		app.bind(Identifiers.TransactionPool.Storage).toConstantValue({ boot: () => calls.push("storage") });
		app.bind(Identifiers.TransactionPool.Service).toConstantValue({ boot: async () => calls.push("service") });

		await serviceProvider.boot();

		assert.equal(calls, ["storage", "service"]);
	});

	it("dispose - should dispose the service before the storage", async ({ app, serviceProvider }) => {
		const calls: string[] = [];
		app.bind(Identifiers.TransactionPool.Service).toConstantValue({ dispose: () => calls.push("service") });
		app.bind(Identifiers.TransactionPool.Storage).toConstantValue({ dispose: () => calls.push("storage") });

		await serviceProvider.dispose();

		assert.equal(calls, ["service", "storage"]);
	});
});

describe<{
	app: Application;
	environment: Record<string, string | undefined>;
	serviceProvider: ServiceProvider;
}>("ServiceProvider.configSchema", ({ it, assert, beforeEach, afterEach, each }) => {
	const importDefaults = async () => (await importFresh("../distribution/defaults.js")).defaults;

	beforeEach((context) => {
		context.app = new Application();

		context.serviceProvider = context.app.resolve(ServiceProvider);

		context.environment = {};
		for (const name of environmentVariables) {
			context.environment[name] = process.env[name];
			delete process.env[name];
		}
	});

	afterEach(({ environment }) => {
		for (const name of environmentVariables) {
			if (environment[name] === undefined) {
				delete process.env[name];
			} else {
				process.env[name] = environment[name];
			}
		}
	});

	it("should validate schema using defaults", async ({ serviceProvider }) => {
		const { error, value } = serviceProvider.configSchema().validate(await importDefaults());

		assert.undefined(error);

		assert.array(value.allowedSenders);
		assert.true(value.enabled);
		assert.number(value.maxTransactionAge);
		assert.number(value.maxTransactionBytes);
		assert.number(value.maxTransactionsInPool);
		assert.number(value.maxTransactionsPerRequest);
		assert.number(value.maxTransactionsPerSender);
		assert.number(value.rebroadcastCooldownBlocks);
		assert.number(value.rebroadcastThreshold);
		assert.string(value.storage);
	});

	it("should allow configuration extension", async ({ serviceProvider }) => {
		const defaults = await importDefaults();

		defaults.customField = "dummy";

		const { error, value } = serviceProvider.configSchema().validate(defaults);

		assert.undefined(error);
		assert.equal(value.customField, "dummy");
	});

	it("should return false when process.env.MAINSAIL_TRANSACTION_POOL_DISABLED is present", async ({
		serviceProvider,
	}) => {
		process.env[EnvironmentVariables.MAINSAIL_TRANSACTION_POOL_DISABLED] = "true";

		const { error, value } = serviceProvider.configSchema().validate(await importDefaults());

		assert.undefined(error);
		assert.false(value.enabled);
	});

	each(
		"should parse process.env.%s",
		async ({ context: { serviceProvider }, dataset: name }) => {
			process.env[name] = "42";

			const { error, value } = serviceProvider.configSchema().validate(await importDefaults());

			assert.undefined(error);
			assert.equal(value[numericSettings[name]], 42);
		},
		Object.keys(numericSettings),
	);

	each(
		"should throw if process.env.%s is not number",
		async ({ context: { serviceProvider }, dataset: name }) => {
			process.env[name] = "false";

			const { error } = serviceProvider.configSchema().validate(await importDefaults());

			assert.equal(error?.message, `"${numericSettings[name]}" must be a number`);
		},
		Object.keys(numericSettings),
	);

	it("schema restrictions - enabled is required", async ({ serviceProvider }) => {
		const defaults = await importDefaults();

		delete defaults.enabled;

		assert.equal(serviceProvider.configSchema().validate(defaults).error?.message, '"enabled" is required');
	});

	it("schema restrictions - storage is required", async ({ serviceProvider }) => {
		const defaults = await importDefaults();

		delete defaults.storage;

		assert.equal(serviceProvider.configSchema().validate(defaults).error?.message, '"storage" is required');
	});

	it("schema restrictions - allowedSenders is required && must contain strings", async ({ serviceProvider }) => {
		const defaults = await importDefaults();

		delete defaults.allowedSenders;
		assert.equal(serviceProvider.configSchema().validate(defaults).error?.message, '"allowedSenders" is required');

		defaults.allowedSenders = [1, 2];
		assert.equal(
			serviceProvider.configSchema().validate(defaults).error?.message,
			'"allowedSenders[0]" must be a string',
		);
	});

	each(
		"schema restrictions - %s is required && is integer && >= 1",
		async ({ context: { serviceProvider }, dataset: key }) => {
			const defaults = await importDefaults();

			defaults[key] = false;
			assert.equal(serviceProvider.configSchema().validate(defaults).error?.message, `"${key}" must be a number`);

			defaults[key] = 1.12;
			assert.equal(
				serviceProvider.configSchema().validate(defaults).error?.message,
				`"${key}" must be an integer`,
			);

			defaults[key] = 0;
			assert.equal(
				serviceProvider.configSchema().validate(defaults).error?.message,
				`"${key}" must be greater than or equal to 1`,
			);

			delete defaults[key];
			assert.equal(serviceProvider.configSchema().validate(defaults).error?.message, `"${key}" is required`);
		},
		[
			"maxTransactionAge",
			"maxTransactionBytes",
			"maxTransactionsInPool",
			"maxTransactionsPerRequest",
			"maxTransactionsPerSender",
		],
	);

	it("schema restrictions - rebroadcastCooldownBlocks is required && is integer && >= 0", async ({
		serviceProvider,
	}) => {
		const defaults = await importDefaults();

		defaults.rebroadcastCooldownBlocks = 0;
		assert.undefined(serviceProvider.configSchema().validate(defaults).error);

		defaults.rebroadcastCooldownBlocks = false;
		assert.equal(
			serviceProvider.configSchema().validate(defaults).error?.message,
			'"rebroadcastCooldownBlocks" must be a number',
		);

		defaults.rebroadcastCooldownBlocks = 1.12;
		assert.equal(
			serviceProvider.configSchema().validate(defaults).error?.message,
			'"rebroadcastCooldownBlocks" must be an integer',
		);

		defaults.rebroadcastCooldownBlocks = -1;
		assert.equal(
			serviceProvider.configSchema().validate(defaults).error?.message,
			'"rebroadcastCooldownBlocks" must be greater than or equal to 0',
		);

		delete defaults.rebroadcastCooldownBlocks;
		assert.equal(
			serviceProvider.configSchema().validate(defaults).error?.message,
			'"rebroadcastCooldownBlocks" is required',
		);
	});

	it("schema restrictions - rebroadcastThreshold is required && is integer && between 0 and 100", async ({
		serviceProvider,
	}) => {
		const defaults = await importDefaults();

		defaults.rebroadcastThreshold = 0;
		assert.undefined(serviceProvider.configSchema().validate(defaults).error);

		defaults.rebroadcastThreshold = 100;
		assert.undefined(serviceProvider.configSchema().validate(defaults).error);

		defaults.rebroadcastThreshold = false;
		assert.equal(
			serviceProvider.configSchema().validate(defaults).error?.message,
			'"rebroadcastThreshold" must be a number',
		);

		defaults.rebroadcastThreshold = 1.12;
		assert.equal(
			serviceProvider.configSchema().validate(defaults).error?.message,
			'"rebroadcastThreshold" must be an integer',
		);

		defaults.rebroadcastThreshold = -1;
		assert.equal(
			serviceProvider.configSchema().validate(defaults).error?.message,
			'"rebroadcastThreshold" must be greater than or equal to 0',
		);

		defaults.rebroadcastThreshold = 101;
		assert.equal(
			serviceProvider.configSchema().validate(defaults).error?.message,
			'"rebroadcastThreshold" must be less than or equal to 100',
		);

		delete defaults.rebroadcastThreshold;
		assert.equal(
			serviceProvider.configSchema().validate(defaults).error?.message,
			'"rebroadcastThreshold" is required',
		);
	});
});
