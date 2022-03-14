import { Container } from "@arkecosystem/core-container";
import { Identifiers } from "@arkecosystem/core-contracts";
import { Application, Providers, Services } from "@arkecosystem/core-kernel";
import importFresh from "import-fresh";
import { AnySchema } from "joi";

import { describe } from "../../core-test-framework";
import { ServiceProvider } from "./service-provider";

const loadDefaults = (): { defaults: Record<string, any> } => importFresh("./defaults");

describe<{
	app: Application;
	serviceProvider: ServiceProvider;
}>("ServiceProvider", ({ assert, beforeEach, it, stub }) => {
	beforeEach((context) => {
		context.app = new Application(new Container());

		context.app.bind(Identifiers.StateStore).toConstantValue({ reset: () => {} });
		context.app.bind(Identifiers.Database.Service).toConstantValue({});
		context.app.bind(Identifiers.DatabaseInteraction).toConstantValue({});
		context.app.bind(Identifiers.Database.BlockStorage).toConstantValue({});
		context.app.bind(Identifiers.TransactionPoolService).toConstantValue({});
		context.app.bind(Identifiers.LogService).toConstantValue({});
		context.app.bind(Identifiers.EventDispatcherService).toConstantValue({});
		context.app.bind(Identifiers.Database.TransactionStorage).toConstantValue({});
		context.app.bind(Identifiers.PluginConfiguration).to(Providers.PluginConfiguration).inSingletonScope();
		context.app.bind(Identifiers.TriggerService).to(Services.Triggers.Triggers).inSingletonScope();

		context.serviceProvider = context.app.resolve<ServiceProvider>(ServiceProvider);
	});

	it("register should bind blockchain, state machine and block processr", async (context) => {
		const pluginConfiguration = context.app.resolve<Providers.PluginConfiguration>(Providers.PluginConfiguration);
		context.serviceProvider.setConfig(pluginConfiguration);

		assert.false(context.app.isBound(Identifiers.StateMachine));
		assert.false(context.app.isBound(Identifiers.BlockchainService));
		assert.false(context.app.isBound(Identifiers.BlockProcessor));

		await context.serviceProvider.register();

		assert.true(context.app.isBound(Identifiers.StateMachine));
		assert.true(context.app.isBound(Identifiers.BlockchainService));
		assert.true(context.app.isBound(Identifiers.BlockProcessor));
	});

	it("boot should call boot on blockchain service", async (context) => {
		const blockchainService = { boot: () => {} };
		const spyBoot = stub(blockchainService, "boot");
		context.app.bind(Identifiers.BlockchainService).toConstantValue(blockchainService);

		await context.serviceProvider.boot();

		spyBoot.calledOnce();
	});

	it("dispose should call dispose on blockchain service", async (context) => {
		const blockchainService = { dispose: () => {} };
		const spyDispose = stub(blockchainService, "dispose");
		context.app.bind(Identifiers.BlockchainService).toConstantValue(blockchainService);

		await context.serviceProvider.dispose();

		spyDispose.calledOnce();
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

		assert.equal(result.error.message, '"databaseRollback" is required');
	});

	it("databaseRollback.maxBlockRewind is required && is integer && >= 1", async (context) => {
		const defaults = loadDefaults().defaults;
		defaults.databaseRollback.maxBlockRewind = false;
		let result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error.message, '"databaseRollback.maxBlockRewind" must be a number');

		defaults.databaseRollback.maxBlockRewind = 1.12;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error.message, '"databaseRollback.maxBlockRewind" must be an integer');

		defaults.databaseRollback.maxBlockRewind = 0;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error.message, '"databaseRollback.maxBlockRewind" must be greater than or equal to 1');

		delete defaults.databaseRollback.maxBlockRewind;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error.message, '"databaseRollback.maxBlockRewind" is required');
	});

	it("databaseRollback.steps is required && is integer && >= 1", async (context) => {
		const defaults = loadDefaults().defaults;
		defaults.databaseRollback.steps = false;
		let result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error.message, '"databaseRollback.steps" must be a number');

		defaults.databaseRollback.steps = 1.12;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error.message, '"databaseRollback.steps" must be an integer');

		defaults.databaseRollback.steps = 0;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error.message, '"databaseRollback.steps" must be greater than or equal to 1');

		delete defaults.databaseRollback.steps;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error.message, '"databaseRollback.steps" is required');
	});

	it("networkStart is optional && is boolean", async (context) => {
		const defaults = loadDefaults().defaults;
		defaults.networkStart = 123;
		let result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error.message, '"networkStart" must be a boolean');

		delete defaults.networkStart;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.undefined(result.error);
	});
});
