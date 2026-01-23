import { Identifiers } from "@mainsail/constants";
import * as Exceptions from "@mainsail/exceptions";
import { setMaxListeners } from "events";
import { join } from "path";
import { dirSync } from "tmp";

import { describe } from "@mainsail/test-runner";
import { Application } from "./application";
import { ServiceProvider, ServiceProviderRepository } from "./providers";
import { ConfigRepository } from "./services/config";
import { MemoryEventDispatcher } from "./services/events";

class StubServiceProvider extends ServiceProvider {
	public async register(): Promise<void> {}

	public name(): string {
		return "name";
	}

	public version(): string {
		return "version";
	}
}

describe<{
	app: Application;
	logger: Record<string, Function>;
}>("Application", ({ afterEach, assert, beforeEach, it, spy, stub }) => {
	beforeEach((context) => {
		delete process.env.MAINSAIL_PATH_CONFIG;

		// TODO
		setMaxListeners(1000);

		context.app = new Application();

		context.logger = {
			debug: () => {},
			error: () => {},
			notice: () => {},
		};

		context.app.bind(Identifiers.Services.Filesystem.Service).toConstantValue({ existsSync: () => true });

		context.app.bind(Identifiers.Services.Log.Service).toConstantValue(context.logger);
	});

	afterEach(() => {
		delete process.env.MAINSAIL_PATH_CONFIG;
	});

	it("should bootstrap the application", async (context) => {
		context.app.unbind(Identifiers.Services.Filesystem.Service);

		await context.app.bootstrap({
			flags: {
				name: "local",
				network: "devnet",
				paths: { config: join(import.meta.dirname, "../test/stubs/config/local") },
				token: "ark",
			},
		});
	});

	it("should bootstrap the application with a config path from process.env", async (context) => {
		process.env.MAINSAIL_PATH_CONFIG = join(import.meta.dirname, "../test/stubs/config");

		context.app.unbind(Identifiers.Services.Filesystem.Service);

		await context.app.bootstrap({
			flags: { name: "local", network: "devnet", token: "ark" },
		});

		assert.is(context.app.configPath(), process.env.MAINSAIL_PATH_CONFIG);
	});

	it("should boot the application", async (context) => {
		// Arrange
		context.app
			.bind(Identifiers.Services.EventDispatcher.Service)
			.toConstantValue(context.app.resolve<MemoryEventDispatcher>(MemoryEventDispatcher));

		const serviceProviderRepository = context.app.get<ServiceProviderRepository>(
			Identifiers.ServiceProvider.Repository,
		);

		const serviceProvider = context.app.resolve(StubServiceProvider);
		const spyRegister = spy(serviceProvider, "register");
		const spyBoot = spy(serviceProvider, "boot");
		serviceProviderRepository.set("stub", serviceProvider);

		assert.false(context.app.isBooted());

		// Act
		serviceProviderRepository.load("stub");
		await context.app.boot();

		// Assert
		spyRegister.calledOnce();
		spyBoot.calledOnce();
		assert.true(context.app.isBooted());
	});

	it.skip("should reboot the application", async (context) => {
		// Arrange
		context.app
			.bind(Identifiers.Services.EventDispatcher.Service)
			.toConstantValue(context.app.resolve<MemoryEventDispatcher>(MemoryEventDispatcher));

		const serviceProviderRepository = context.app.get<ServiceProviderRepository>(
			Identifiers.ServiceProvider.Repository,
		);

		const serviceProvider = context.app.resolve(StubServiceProvider);
		const spyRegister = spy(serviceProvider, "register");
		const spyBoot = spy(serviceProvider, "boot");
		const spyDispose = spy(serviceProvider, "dispose");
		serviceProviderRepository.set("stub", serviceProvider);

		// Act
		serviceProviderRepository.load("stub");
		await context.app.reboot();

		// Assert
		expect(spyRegister).toHaveBeenCalled();
		expect(spyBoot).toHaveBeenCalled();
		spyDispose.calledOnce();
		assert.true(context.app.isBooted());
	});

	it("should get and set the given configuration value", (context) => {
		context.app.get<ConfigRepository>(Identifiers.Config.Repository).merge({ key: "Hello World" });

		assert.is(context.app.config("key"), "Hello World");

		assert.is(context.app.config("key", "new"), "new");
	});

	it("should return the version", (context) => {
		context.app.bind(Identifiers.Application.Version).toConstantValue("Hello World");

		assert.is(context.app.version(), "Hello World");
	});

	it("should fail to set a path if it does not exist", (context) => {
		context.app.bind("path.data").toConstantValue("");

		stub(context.app.get(Identifiers.Services.Filesystem.Service), "existsSync").returnValue(false);

		assert.throws(() => context.app.dataPath(), new Exceptions.DirectoryCannotBeFound(""));

		assert.throws(() => context.app.useDataPath(), new Exceptions.DirectoryCannotBeFound(""));
	});

	it("should set and get the given data path", (context) => {
		const path: string = dirSync().name;

		context.app.bind("path.data").toConstantValue(path);

		assert.is(context.app.dataPath(), path);
		assert.is(context.app.dataPath("file.txt"), `${path}/file.txt`);

		const pathNew: string = dirSync().name;
		context.app.useDataPath(pathNew);

		assert.is(context.app.dataPath(), pathNew);
		assert.is(context.app.dataPath("file.txt"), `${pathNew}/file.txt`);
	});

	it("should set and get the given config path", (context) => {
		const path: string = dirSync().name;

		context.app.bind("path.config").toConstantValue(path);

		assert.is(context.app.configPath(), path);
		assert.is(context.app.configPath("file.txt"), `${path}/file.txt`);

		const pathNew: string = dirSync().name;
		context.app.useConfigPath(pathNew);

		assert.is(context.app.configPath(), pathNew);
		assert.is(context.app.configPath("file.txt"), `${pathNew}/file.txt`);
	});

	it("should set and get the given cache path", (context) => {
		const path: string = dirSync().name;

		context.app.bind("path.cache").toConstantValue(path);

		assert.is(context.app.cachePath(), path);
		assert.is(context.app.cachePath("file.txt"), `${path}/file.txt`);

		const pathNew: string = dirSync().name;
		context.app.useCachePath(pathNew);

		assert.is(context.app.cachePath(), pathNew);
		assert.is(context.app.cachePath("file.txt"), `${pathNew}/file.txt`);
	});

	it("should set and get the given log path", (context) => {
		const path: string = dirSync().name;

		context.app.bind("path.log").toConstantValue(path);

		assert.is(context.app.logPath(), path);
		assert.is(context.app.logPath("file.txt"), `${path}/file.txt`);

		const pathNew: string = dirSync().name;
		context.app.useLogPath(pathNew);

		assert.is(context.app.logPath(), pathNew);
		assert.is(context.app.logPath("file.txt"), `${pathNew}/file.txt`);
	});

	it("should set and get the given temp path", (context) => {
		const path: string = dirSync().name;

		context.app.bind("path.temp").toConstantValue(path);

		assert.is(context.app.tempPath(), path);
		assert.is(context.app.tempPath("file.txt"), `${path}/file.txt`);

		const pathNew: string = dirSync().name;
		context.app.useTempPath(pathNew);

		assert.is(context.app.tempPath(), pathNew);
		assert.is(context.app.tempPath("file.txt"), `${pathNew}/file.txt`);
	});

	it("should return the environment file path", (context) => {
		const path: string = dirSync().name;

		context.app.bind("path.config").toConstantValue(path);

		assert.is(context.app.environmentFile(), `${path}/.env`);
	});

	it("should set and get the environment", (context) => {
		context.app.bind(Identifiers.Application.Environment).toConstantValue("development");

		assert.is(context.app.environment(), "development");

		context.app.useEnvironment("production");

		assert.is(context.app.environment(), "production");
	});

	it.skip("should terminate the application", async (context) => {
		// Arrange
		context.app
			.bind(Identifiers.Services.EventDispatcher.Service)
			.toConstantValue(context.app.resolve<MemoryEventDispatcher>(MemoryEventDispatcher));

		const serviceProviderRepository = context.app.get<ServiceProviderRepository>(
			Identifiers.ServiceProvider.Repository,
		);

		const serviceProvider = context.app.resolve(StubServiceProvider);
		const spyDispose = spy(serviceProvider, "dispose");
		serviceProviderRepository.set("stub", serviceProvider);

		// Act
		serviceProviderRepository.load("stub");
		await context.app.boot();
		await context.app.terminate();

		// Assert
		spyDispose.calledOnce();
		assert.false(context.app.isBooted());
	});

	it.skip("should terminate the application with a reason", async (context) => {
		// Arrange
		context.app
			.bind(Identifiers.Services.EventDispatcher.Service)
			.toConstantValue(context.app.resolve<MemoryEventDispatcher>(MemoryEventDispatcher));

		const serviceProviderRepository = context.app.get<ServiceProviderRepository>(
			Identifiers.ServiceProvider.Repository,
		);

		const serviceProvider = context.app.resolve(StubServiceProvider);
		const spyDispose = spy(serviceProvider, "dispose");
		serviceProviderRepository.set("stub", serviceProvider);

		// Act
		serviceProviderRepository.load("stub");
		await context.app.boot();
		await context.app.terminate("Hello World");

		// Assert
		expect(context.logger.notice).toHaveBeenCalledWith("Hello World");
		spyDispose.calledOnce();
		assert.false(context.app.isBooted());
	});

	it.skip("should terminate the application with an error", async (context) => {
		// Arrange
		context.app
			.bind(Identifiers.Services.EventDispatcher.Service)
			.toConstantValue(context.app.resolve<MemoryEventDispatcher>(MemoryEventDispatcher));

		const serviceProviderRepository = context.app.get<ServiceProviderRepository>(
			Identifiers.ServiceProvider.Repository,
		);

		const serviceProvider = context.app.resolve(StubServiceProvider);
		const spyDispose = spy(serviceProvider, "dispose");
		const errorLogSpy = spy(context.logger, "error");
		serviceProviderRepository.set("stub", serviceProvider);

		// Act
		serviceProviderRepository.load("stub");
		const error = new Error("Hello World");
		await context.app.boot();
		await context.app.terminate(undefined, error);

		// Assert
		errorLogSpy.calledWith(error.stack);
		spyDispose.calledOnce();
		assert.false(context.app.isBooted());
	});
});
