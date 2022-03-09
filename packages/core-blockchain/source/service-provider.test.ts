import { Application, Container, Providers, Services } from "@arkecosystem/core-kernel";
import { AnySchema } from "joi";
import importFresh from "import-fresh";
import { describe } from "../../core-test-framework";

import { ServiceProvider } from "./service-provider";

const loadDefaults = (): { defaults: Record<string, any> } => importFresh("./defaults");

describe<{
	app: Application;
	serviceProvider: ServiceProvider;
}>("ServiceProvider", ({ assert, beforeEach, it, spy, spyFn, stub, stubFn }) => {
	beforeEach((context) => {
		context.app = new Application(new Container.Container());

		context.app.bind(Container.Identifiers.StateStore).toConstantValue({ reset: () => undefined });
		context.app.bind(Container.Identifiers.DatabaseService).toConstantValue({});
		context.app.bind(Container.Identifiers.DatabaseInteraction).toConstantValue({});
		context.app.bind(Container.Identifiers.DatabaseBlockRepository).toConstantValue({});
		context.app.bind(Container.Identifiers.TransactionPoolService).toConstantValue({});
		context.app.bind(Container.Identifiers.LogService).toConstantValue({});
		context.app.bind(Container.Identifiers.EventDispatcherService).toConstantValue({});
		context.app.bind(Container.Identifiers.DatabaseTransactionRepository).toConstantValue({});
		context.app
			.bind(Container.Identifiers.PluginConfiguration)
			.to(Providers.PluginConfiguration)
			.inSingletonScope();
		context.app.bind(Container.Identifiers.TriggerService).to(Services.Triggers.Triggers).inSingletonScope();

		context.serviceProvider = context.app.resolve<ServiceProvider>(ServiceProvider);
	});

	it("register should bind blockchain, state machine and block processr", async (context) => {
		const pluginConfiguration = context.app.resolve<Providers.PluginConfiguration>(Providers.PluginConfiguration);
		context.serviceProvider.setConfig(pluginConfiguration);

		assert.false(context.app.isBound(Container.Identifiers.StateMachine));
		assert.false(context.app.isBound(Container.Identifiers.BlockchainService));
		assert.false(context.app.isBound(Container.Identifiers.BlockProcessor));

		await context.serviceProvider.register();

		assert.true(context.app.isBound(Container.Identifiers.StateMachine));
		assert.true(context.app.isBound(Container.Identifiers.BlockchainService));
		assert.true(context.app.isBound(Container.Identifiers.BlockProcessor));
	});

	it("boot should call boot on blockchain service", async (context) => {
		const blockchainService = { boot: spyFn() };
		context.app.bind(Container.Identifiers.BlockchainService).toConstantValue(blockchainService);

		await context.serviceProvider.boot();

		assert.true(blockchainService.boot.calledOnce);
	});

	it("dispose should call dispose on blockchain service", async (context) => {
		const blockchainService = { dispose: spyFn() };
		context.app.bind(Container.Identifiers.BlockchainService).toConstantValue(blockchainService);

		await context.serviceProvider.dispose();

		assert.true(blockchainService.dispose.calledOnce);
	});

	it("required should return true", async (context) => {
		const required = await context.serviceProvider.required();

		assert.true(required);
	});

	it("configSchema should validate schema using defaults", async (context) => {
		const result = (context.serviceProvider.configSchema() as AnySchema).validate(loadDefaults().defaults);

		assert.undefined(result.error);

		assert.number(result.value.databaseRollback.maxBlockRewind);
		assert.number(result.value.databaseRollback.steps);
	});

	it("configSchema should allow configuration extension", async (context) => {
		const defaults = loadDefaults().defaults;

		// @ts-ignore
		defaults.customField = "dummy";

		const result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.undefined(result.error);
		assert.equal(result.value.customField, "dummy");
	});

	it("databaseRollback is required", async (context) => {
		const defaults = loadDefaults().defaults;
		delete defaults.databaseRollback;
		const result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"databaseRollback" is required');
	});

	it("databaseRollback.maxBlockRewind is required && is integer && >= 1", async (context) => {
		const defaults = loadDefaults().defaults;
		defaults.databaseRollback.maxBlockRewind = false;
		let result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"databaseRollback.maxBlockRewind" must be a number');

		defaults.databaseRollback.maxBlockRewind = 1.12;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"databaseRollback.maxBlockRewind" must be an integer');

		defaults.databaseRollback.maxBlockRewind = 0;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"databaseRollback.maxBlockRewind" must be greater than or equal to 1');

		delete defaults.databaseRollback.maxBlockRewind;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"databaseRollback.maxBlockRewind" is required');
	});

	it("databaseRollback.steps is required && is integer && >= 1", async (context) => {
		const defaults = loadDefaults().defaults;
		defaults.databaseRollback.steps = false;
		let result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"databaseRollback.steps" must be a number');

		defaults.databaseRollback.steps = 1.12;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"databaseRollback.steps" must be an integer');

		defaults.databaseRollback.steps = 0;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"databaseRollback.steps" must be greater than or equal to 1');

		delete defaults.databaseRollback.steps;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"databaseRollback.steps" is required');
	});

	it("networkStart is optional && is boolean", async (context) => {
		const defaults = loadDefaults().defaults;
		defaults.networkStart = 123;
		let result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error!.message, '"networkStart" must be a boolean');

		delete defaults.networkStart;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.undefined(result.error);
	});
});
