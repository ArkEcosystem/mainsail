import { Container } from "@mainsail/container";
import { Identifiers } from "@mainsail/contracts";
import { Application, Providers, Services } from "@mainsail/kernel";
import { AnySchema } from "joi";
import { dirSync } from "tmp";

import { describe } from "../../test-framework/source";
import { ServiceProvider } from "./service-provider";

const importFresh = (moduleName) => import(`${moduleName}?${Date.now()}`);

const loadDefaults = async () => (await importFresh("./defaults")).defaults;

describe("ServiceProvider", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.app = new Application(new Container());
		context.app.bind(Identifiers.Config.Flags).toConstantValue("core");
		context.app.bind(Identifiers.Application.Name).toConstantValue("mainsail");
		context.app.bind(Identifiers.Application.Thread).toConstantValue("main");
		context.app.bind(Identifiers.Services.Filesystem.Service).toConstantValue({ existsSync: () => true });

		context.serviceProvider = context.app.resolve<ServiceProvider>(ServiceProvider);
	});

	it("should register", async (context) => {
		context.app
			.bind<Services.Log.LogManager>(Identifiers.Services.Log.Manager)
			.to(Services.Log.LogManager)
			.inSingletonScope();

		await context.app.get<Services.Log.LogManager>(Identifiers.Services.Log.Manager).boot();

		context.serviceProvider.setConfig(
			context.app.resolve(Providers.PluginConfiguration).merge(await loadDefaults()),
		);

		context.app.bind("path.log").toConstantValue(dirSync().name);

		await assert.resolves(() => context.serviceProvider.register());
	});

	it("should be disposable", async (context) => {
		context.app
			.bind<Services.Log.LogManager>(Identifiers.Services.Log.Manager)
			.to(Services.Log.LogManager)
			.inSingletonScope();

		await context.app.get<Services.Log.LogManager>(Identifiers.Services.Log.Manager).boot();

		context.serviceProvider.setConfig(
			context.app.resolve(Providers.PluginConfiguration).merge(await loadDefaults()),
		);

		context.app.bind("path.log").toConstantValue(dirSync().name);

		context.app
			.bind(Identifiers.Services.Log.Service)
			.toDynamicValue((context: Container.interfaces.Context) =>
				context.container.get<Services.Log.LogManager>(Identifiers.Services.Log.Manager).driver(),
			);

		await assert.resolves(() => context.serviceProvider.register());

		await assert.resolves(() => context.serviceProvider.dispose());
	});

	it("should validate schema using defaults", async (context) => {
		const writableDefaults = await loadDefaults();

		const result = (context.serviceProvider.configSchema() as AnySchema).validate(writableDefaults);

		assert.undefined(result.error);

		assert.string(result.value.levels.console);
		assert.string(result.value.levels.file);

		assert.string(result.value.fileRotator.interval);
	});

	it("should allow configuration extension", async (context) => {
		const writableDefaults = await loadDefaults();

		writableDefaults.customField = "dummy";

		const result = (context.serviceProvider.configSchema() as AnySchema).validate(writableDefaults);

		assert.undefined(result.error);
		assert.equal(result.value.customField, "dummy");
	});

	it("should return value of process.env.CORE_LOG_LEVEL if defined", async (context) => {
		process.env.CORE_LOG_LEVEL = "dummy";

		const result = (context.serviceProvider.configSchema() as AnySchema).validate(await loadDefaults());

		assert.undefined(result.error);
		assert.equal(result.value.levels.console, "dummy");
	});

	it("should return value of process.env.CORE_LOG_LEVEL_FILE if defined", async (context) => {
		process.env.CORE_LOG_LEVEL_FILE = "dummy";

		const result = (context.serviceProvider.configSchema() as AnySchema).validate(await loadDefaults());

		assert.undefined(result.error);
		assert.equal(result.value.levels.file, "dummy");
	});

	it("levels is required && is object", async (context) => {
		const writableDefaults = await loadDefaults();

		writableDefaults.levels = false;
		let result = (context.serviceProvider.configSchema() as AnySchema).validate(writableDefaults);

		assert.equal(result.error.message, '"levels" must be of type object');

		delete writableDefaults.levels;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(writableDefaults);

		assert.equal(result.error.message, '"levels" is required');
	});

	it("levels.console is required && is string", async (context) => {
		const writableDefaults = await loadDefaults();

		writableDefaults.levels.console = false;
		let result = (context.serviceProvider.configSchema() as AnySchema).validate(writableDefaults);

		assert.equal(result.error.message, '"levels.console" must be a string');

		delete writableDefaults.levels.console;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(writableDefaults);

		assert.equal(result.error.message, '"levels.console" is required');
	});

	it("levels.file is required && is string", async (context) => {
		const writableDefaults = await loadDefaults();

		writableDefaults.levels.file = false;
		let result = (context.serviceProvider.configSchema() as AnySchema).validate(writableDefaults);

		assert.equal(result.error.message, '"levels.file" must be a string');

		delete writableDefaults.levels.file;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(writableDefaults);

		assert.equal(result.error.message, '"levels.file" is required');
	});

	it("fileRotator is required && is object", async (context) => {
		const writableDefaults = await loadDefaults();

		writableDefaults.fileRotator = false;
		let result = (context.serviceProvider.configSchema() as AnySchema).validate(writableDefaults);

		assert.equal(result.error.message, '"fileRotator" must be of type object');

		delete writableDefaults.fileRotator;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(writableDefaults);

		assert.equal(result.error.message, '"fileRotator" is required');
	});

	it("fileRotator.interval is required && is string", async (context) => {
		const writableDefaults = await loadDefaults();

		writableDefaults.fileRotator.interval = false;
		let result = (context.serviceProvider.configSchema() as AnySchema).validate(writableDefaults);

		assert.equal(result.error.message, '"fileRotator.interval" must be a string');

		delete writableDefaults.fileRotator.interval;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(writableDefaults);

		assert.equal(result.error.message, '"fileRotator.interval" is required');
	});
});
