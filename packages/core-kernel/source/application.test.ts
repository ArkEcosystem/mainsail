import { Container, injectable, interfaces } from "@arkecosystem/core-container";
import { Exceptions, Identifiers } from "@arkecosystem/core-contracts";
import { resolve } from "path";
import { dirSync } from "tmp";

import { describe } from "../../core-test-framework";
import { Application } from "./application";
import { ServiceProvider, ServiceProviderRepository } from "./providers";
import { ConfigRepository } from "./services/config";
import { MemoryEventDispatcher } from "./services/events";

@injectable()
class StubClass {}

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
	container: interfaces.Container;
	logger: Record<string, Function>;
}>("Application", ({ afterEach, assert, beforeEach, it, spy }) => {
	beforeEach((context) => {
		context.container = new Container();

		context.app = new Application(context.container);

		context.logger = {
			debug: () => {},
			error: () => {},
			notice: () => {},
		};

		context.app.bind(Identifiers.LogService).toConstantValue(context.logger);
	});

	afterEach(() => {
		delete process.env.CORE_PATH_CONFIG;
	});

	it("should bootstrap the application", async (context) => {
		console.error(resolve(__dirname, "../test/stubs/config"));
		await context.app.bootstrap({
			flags: {
				network: "testnet",
				paths: { config: resolve(__dirname, "../test/stubs/config") },
				token: "ark",
			},
		});

		assert.equal(context.app.dirPrefix(), "ark/testnet");
	});

	it("should bootstrap the application with a config path from process.env", async (context) => {
		process.env.CORE_PATH_CONFIG = resolve(__dirname, "../test/stubs/config");

		await context.app.bootstrap({
			flags: { network: "testnet", token: "ark" },
		});

		assert.is(context.app.configPath(), process.env.CORE_PATH_CONFIG);
	});

	it("should fail to bootstrap the application if no token is provided", async (context) => {
		await assert.rejects(
			() =>
				context.app.bootstrap({
					flags: { network: "testnet", paths: { config: resolve(__dirname, "../test/stubs/config") } },
				}),
			Exceptions.NetworkCannotBeDetermined,
		);
	});

	it("should fail to bootstrap the application if no network is provided", async (context) => {
		await assert.rejects(
			() =>
				context.app.bootstrap({
					flags: { paths: { config: resolve(__dirname, "../test/stubs/config") }, token: "ark" },
				}),
			Exceptions.NetworkCannotBeDetermined,
		);
	});

	it("should boot the application", async (context) => {
		// Arrange
		context.app
			.bind(Identifiers.EventDispatcherService)
			.toConstantValue(context.app.resolve<MemoryEventDispatcher>(MemoryEventDispatcher));

		const serviceProviderRepository = context.app.get<ServiceProviderRepository>(
			Identifiers.ServiceProviderRepository,
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
			.bind(Identifiers.EventDispatcherService)
			.toConstantValue(context.app.resolve<MemoryEventDispatcher>(MemoryEventDispatcher));

		const serviceProviderRepository = context.app.get<ServiceProviderRepository>(
			Identifiers.ServiceProviderRepository,
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
		context.app.get<ConfigRepository>(Identifiers.ConfigRepository).merge({ key: "Hello World" });

		assert.is(context.app.config("key"), "Hello World");

		assert.is(context.app.config("key", "new"), "new");
	});

	it("should return the directory prefix", (context) => {
		context.app.bind(Identifiers.ApplicationDirPrefix).toConstantValue("Hello World");

		assert.is(context.app.dirPrefix(), "Hello World");
	});

	it("should return the namespace", (context) => {
		context.app.bind(Identifiers.ApplicationNamespace).toConstantValue("Hello World");

		assert.is(context.app.namespace(), "Hello World");
	});

	it("should return the version", (context) => {
		context.app.bind(Identifiers.ApplicationVersion).toConstantValue("Hello World");

		assert.is(context.app.version(), "Hello World");
	});

	it("should return the token", (context) => {
		context.app.bind(Identifiers.ApplicationToken).toConstantValue("Hello World");

		assert.is(context.app.token(), "Hello World");
	});

	it("should return the network", (context) => {
		context.app.bind(Identifiers.ApplicationNetwork).toConstantValue("Hello World");

		assert.is(context.app.network(), "Hello World");
	});

	it("should use the given network", (context) => {
		context.app.useNetwork("testnet");

		assert.is(context.app.network(), "testnet");
	});

	it("should use the given network even if one is already set", (context) => {
		context.app.useNetwork("testnet");

		assert.is(context.app.network(), "testnet");

		const unbindSpy = spy(context.container, "unbind");

		context.app.useNetwork("mainnet");

		assert.is(context.app.network(), "mainnet");
		unbindSpy.calledOnce();
	});

	it("should fail to set a path if it does not exist", (context) => {
		context.app.bind("path.data").toConstantValue();

		assert.throws(() => context.app.dataPath(), new Exceptions.DirectoryCannotBeFound());

		assert.throws(() => context.app.useDataPath(), new Exceptions.DirectoryCannotBeFound());
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
		context.app.bind(Identifiers.ApplicationEnvironment).toConstantValue("development");

		assert.is(context.app.environment(), "development");

		context.app.useEnvironment("production");

		assert.is(context.app.environment(), "production");
	});

	it("should determine if the application is in production (by environment)", (context) => {
		context.app.bind(Identifiers.ApplicationNetwork).toConstantValue("devnet");
		context.app.bind(Identifiers.ApplicationEnvironment).toConstantValue("development");

		assert.false(context.app.isProduction());

		context.app.unbind(Identifiers.ApplicationEnvironment);
		context.app.bind(Identifiers.ApplicationEnvironment).toConstantValue("production");

		assert.true(context.app.isProduction());
	});

	it("should determine if the application is in production (by network)", (context) => {
		context.app.bind(Identifiers.ApplicationNetwork).toConstantValue("devnet");
		context.app.bind(Identifiers.ApplicationEnvironment).toConstantValue("development");

		assert.false(context.app.isProduction());

		context.app.unbind(Identifiers.ApplicationNetwork);
		context.app.bind(Identifiers.ApplicationNetwork).toConstantValue("mainnet");

		assert.true(context.app.isProduction());
	});

	it("should determine if the application is in development (by environment)", (context) => {
		context.app.bind(Identifiers.ApplicationNetwork).toConstantValue("mainnet");
		context.app.bind(Identifiers.ApplicationEnvironment).toConstantValue("production");

		assert.false(context.app.isDevelopment());

		context.app.unbind(Identifiers.ApplicationEnvironment);
		context.app.bind(Identifiers.ApplicationEnvironment).toConstantValue("development");

		assert.true(context.app.isDevelopment());
	});

	it("should determine if the application is in development (by network)", (context) => {
		context.app.bind(Identifiers.ApplicationNetwork).toConstantValue("mainnet");
		context.app.bind(Identifiers.ApplicationEnvironment).toConstantValue("production");

		assert.false(context.app.isDevelopment());

		context.app.unbind(Identifiers.ApplicationNetwork);
		context.app.bind(Identifiers.ApplicationNetwork).toConstantValue("devnet");

		assert.true(context.app.isDevelopment());
	});

	it("should determine if the application is in tests (by environment)", (context) => {
		context.app.bind(Identifiers.ApplicationNetwork).toConstantValue("mainnet");
		context.app.bind(Identifiers.ApplicationEnvironment).toConstantValue("production");

		assert.false(context.app.runningTests());

		context.app.unbind(Identifiers.ApplicationEnvironment);
		context.app.bind(Identifiers.ApplicationEnvironment).toConstantValue("test");

		assert.true(context.app.runningTests());
	});

	it("should determine if the application is in tests (by network)", (context) => {
		context.app.bind(Identifiers.ApplicationNetwork).toConstantValue("mainnet");
		context.app.bind(Identifiers.ApplicationEnvironment).toConstantValue("production");

		assert.false(context.app.runningTests());

		context.app.unbind(Identifiers.ApplicationNetwork);
		context.app.bind(Identifiers.ApplicationNetwork).toConstantValue("testnet");

		assert.true(context.app.runningTests());
	});

	it("should enable and disable maintenance mode", (context) => {
		context.app
			.bind(Identifiers.EventDispatcherService)
			.toConstantValue(context.app.resolve<MemoryEventDispatcher>(MemoryEventDispatcher));

		context.app.bind("path.temp").toConstantValue(dirSync().name);

		assert.false(context.app.isDownForMaintenance());

		context.app.enableMaintenance();

		assert.true(context.app.isDownForMaintenance());

		context.app.disableMaintenance();

		assert.false(context.app.isDownForMaintenance());
	});

	it("should terminate the application", async (context) => {
		// Arrange
		context.app
			.bind(Identifiers.EventDispatcherService)
			.toConstantValue(context.app.resolve<MemoryEventDispatcher>(MemoryEventDispatcher));

		const serviceProviderRepository = context.app.get<ServiceProviderRepository>(
			Identifiers.ServiceProviderRepository,
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
			.bind(Identifiers.EventDispatcherService)
			.toConstantValue(context.app.resolve<MemoryEventDispatcher>(MemoryEventDispatcher));

		const serviceProviderRepository = context.app.get<ServiceProviderRepository>(
			Identifiers.ServiceProviderRepository,
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

	it("should terminate the application with an error", async (context) => {
		// Arrange
		context.app
			.bind(Identifiers.EventDispatcherService)
			.toConstantValue(context.app.resolve<MemoryEventDispatcher>(MemoryEventDispatcher));

		const serviceProviderRepository = context.app.get<ServiceProviderRepository>(
			Identifiers.ServiceProviderRepository,
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

	it("should bind a value to the IoC container", (context) => {
		assert.false(context.app.isBound("key"));

		context.app.bind("key").toConstantValue("value");

		assert.true(context.app.isBound("key"));
	});

	it("should rebind a value to the IoC container", (context) => {
		assert.false(context.app.isBound("key"));

		context.app.bind("key").toConstantValue("value");

		assert.is(context.app.get("key"), "value");
		assert.true(context.app.isBound("key"));

		context.app.rebind("key").toConstantValue("value-new");

		assert.is(context.app.get("key"), "value-new");
	});

	it("should unbind a value from the IoC container", (context) => {
		context.app.bind("key").toConstantValue("value");

		assert.true(context.app.isBound("key"));

		context.app.unbind("key");

		assert.false(context.app.isBound("key"));
	});

	it("should get a value from the IoC container", (context) => {
		context.app.bind("key").toConstantValue("value");

		assert.is(context.app.get("key"), "value");
	});

	it("should get tagged value from the IoC container", async (context) => {
		context.app.bind("animal").toConstantValue("bear").whenTargetTagged("order", "carnivora");
		context.app.bind("animal").toConstantValue("dolphin").whenTargetTagged("order", "cetacea");

		assert.throws(() => context.app.get("animal"));
		assert.is(context.app.getTagged("animal", "order", "carnivora"), "bear");
		assert.is(context.app.getTagged("animal", "order", "cetacea"), "dolphin");
	});

	it("should resolve a value from the IoC container", (context) => {
		assert.instance(context.app.resolve(StubClass), StubClass);
	});
});
