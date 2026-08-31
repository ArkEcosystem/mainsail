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
	public name(): string {
		return "stub";
	}

	public version(): string {
		return "version";
	}
}

describe<{
	app: Application;
	logger: Record<string, Function>;
}>("Application", ({ afterEach, assert, beforeEach, clock, it, spy, stub }) => {
	beforeEach((context) => {
		delete process.env.MAINSAIL_PATH_CONFIG;

		// TODO
		setMaxListeners(1000);

		context.app = new Application();

		context.logger = {
			debug: () => {},
			error: () => {},
			notice: () => {},
			warn: () => {},
		};

		context.app.bind(Identifiers.Services.Filesystem.Service).toConstantValue({ existsSync: () => true });

		context.app.bind(Identifiers.Services.Log.Service).toConstantValue(context.logger);
	});

	afterEach(() => {
		delete process.env.MAINSAIL_PATH_CONFIG;
	});

	it("should bootstrap the application", async (context) => {
		process.env.MAINSAIL_PATH_CONFIG = join(import.meta.dirname, "../test/stubs/config");

		context.app.unbind(Identifiers.Services.Filesystem.Service);

		await assert.resolves(() =>
			context.app.bootstrap({
				flags: { env: "test", name: "local", network: "devnet", token: "ark" },
			}),
		);
	});

	it("should bootstrap the application with a config path from process.env", async (context) => {
		// The base path is joined with the application name to form the final config path.
		const configBase = join(import.meta.dirname, "../test/stubs/config");
		process.env.MAINSAIL_PATH_CONFIG = configBase;

		context.app.unbind(Identifiers.Services.Filesystem.Service);

		await context.app.bootstrap({
			flags: { env: "test", name: "local", network: "devnet", token: "ark" },
		});

		assert.is(context.app.configPath(), join(configBase, "local"));
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

	it("should reboot the application", async (context) => {
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
		spyRegister.called();
		spyBoot.called();
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

	it("should terminate the application", async (context) => {
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

		const spyExit = stub(process, "exit");

		// Act
		serviceProviderRepository.load("stub");
		await context.app.boot();
		await context.app.terminate();

		// Assert
		spyDispose.calledOnce();
		spyExit.calledWith(0);
		assert.false(context.app.isBooted());
	});

	it("should terminate the application with a reason", async (context) => {
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

		const spyExit = stub(process, "exit");
		const spyWarn = spy(context.logger, "warn");

		// Act
		serviceProviderRepository.load("stub");
		await context.app.boot();
		await context.app.terminate("Hello World");

		// Assert
		spyWarn.calledWith("Application shutdown: Hello World");
		spyDispose.calledOnce();
		spyExit.calledWith(0);
		assert.false(context.app.isBooted());
	});

	it("should terminate the application with an error", async (context) => {
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

		const spyExit = stub(process, "exit");

		// Act
		serviceProviderRepository.load("stub");
		const error = new Error("Hello World");
		await context.app.boot();
		await context.app.terminate(undefined, error);

		// Assert
		errorLogSpy.calledWith(error.stack);
		spyDispose.calledOnce();
		spyExit.calledWith(1);
		assert.false(context.app.isBooted());
	});

	it("should terminate the application when booting fails", async (context) => {
		// A bootstrapper failure during boot() must be caught and routed to terminate().
		const spyExit = stub(process, "exit");
		context.app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue({
			dispatch: () => {
				throw new Error("dispatch boom");
			},
			listen: () => {},
		});

		await context.app.boot();

		assert.false(context.app.isBooted());
		spyExit.calledWith(1);
	});

	it("should return a never-resolving promise when terminate is called while already terminating", async (context) => {
		const spyExit = stub(process, "exit");
		context.app
			.bind(Identifiers.Services.EventDispatcher.Service)
			.toConstantValue(context.app.resolve<MemoryEventDispatcher>(MemoryEventDispatcher));

		// First call sets the terminating flag and runs to completion (process.exit is stubbed).
		await context.app.terminate();

		// A second, re-entrant call must short-circuit with a promise that never settles.
		const pending = context.app.terminate();
		const race = await Promise.race([pending.then(() => "resolved"), Promise.resolve("pending")]);

		assert.equal(race, "pending");
		spyExit.calledWith(0);
	});

	it("should force termination when service providers do not dispose in time", async (context) => {
		const spyExit = stub(process, "exit");
		const spyWarn = spy(context.logger, "warn");

		context.app
			.bind(Identifiers.Services.EventDispatcher.Service)
			.toConstantValue(context.app.resolve<MemoryEventDispatcher>(MemoryEventDispatcher));

		const serviceProviderRepository = context.app.get<ServiceProviderRepository>(
			Identifiers.ServiceProvider.Repository,
		);
		const serviceProvider = context.app.resolve(StubServiceProvider);
		// Dispose never settles, so the 3s safety timeout must fire and force-exit.
		serviceProvider.dispose = () => new Promise(() => {});
		serviceProviderRepository.set("stub", serviceProvider);
		serviceProviderRepository.load("stub");

		await context.app.boot();

		const fakeTimers = clock();
		void context.app.terminate();
		await fakeTimers.tickAsync(3000);

		spyWarn.calledWith("Force application termination. Service providers did not dispose in time.");
		spyExit.calledWith(1);
	});

	it("should force exit when the graceful shutdown sequence throws", async (context) => {
		const spyExit = stub(process, "exit");
		// notice() runs at the very end of the graceful path; throwing there hits the catch block.
		context.logger.notice = () => {
			throw new Error("notice boom");
		};

		context.app
			.bind(Identifiers.Services.EventDispatcher.Service)
			.toConstantValue(context.app.resolve<MemoryEventDispatcher>(MemoryEventDispatcher));

		const serviceProviderRepository = context.app.get<ServiceProviderRepository>(
			Identifiers.ServiceProvider.Repository,
		);
		serviceProviderRepository.set("stub", context.app.resolve(StubServiceProvider));
		serviceProviderRepository.load("stub");

		await context.app.boot();
		await context.app.terminate();

		spyExit.calledWith(1);
	});

	it("should log each underlying error when terminating with an AggregateError", async (context) => {
		const spyExit = stub(process, "exit");
		const spyError = spy(context.logger, "error");
		context.app
			.bind(Identifiers.Services.EventDispatcher.Service)
			.toConstantValue(context.app.resolve<MemoryEventDispatcher>(MemoryEventDispatcher));

		const inner1 = new Error("inner one");
		const inner2 = new Error("inner two");
		const aggregate = new AggregateError([inner1, inner2], "aggregate failure");

		await context.app.terminate(undefined, aggregate);

		// The AggregateError itself plus each unwrapped inner error are logged individually.
		spyError.calledTimes(3);
		spyError.calledWith(inner1.stack ?? inner1.message);
		spyError.calledWith(inner2.stack ?? inner2.message);
		spyExit.calledWith(1);
	});

	it("should keep terminating gracefully when a service provider fails to dispose", async (context) => {
		const spyExit = stub(process, "exit");

		context.app
			.bind(Identifiers.Services.EventDispatcher.Service)
			.toConstantValue(context.app.resolve<MemoryEventDispatcher>(MemoryEventDispatcher));

		const serviceProviderRepository = context.app.get<ServiceProviderRepository>(
			Identifiers.ServiceProvider.Repository,
		);
		const serviceProvider = context.app.resolve(StubServiceProvider);
		// A throwing dispose must not abort the shutdown of the remaining providers.
		serviceProvider.dispose = () => {
			throw new Error("dispose boom");
		};
		serviceProviderRepository.set("stub", serviceProvider);
		serviceProviderRepository.load("stub");

		await context.app.boot();
		await context.app.terminate();

		spyExit.calledWith(0);
	});

	it("should warn about active handles still open at shutdown", async (context) => {
		const spyExit = stub(process, "exit");
		const warnings: string[] = [];
		context.logger.warn = (message: string) => {
			warnings.push(message);
		};
		context.app
			.bind(Identifiers.Services.EventDispatcher.Service)
			.toConstantValue(context.app.resolve<MemoryEventDispatcher>(MemoryEventDispatcher));

		// Report a still-open handle so #logOpenHandlers takes its warning branch.
		stub(process, "getActiveResourcesInfo").returnValue(["Timeout", "TTYWrap"]);

		await context.app.terminate();

		assert.true(warnings.some((message) => message.includes("active timeouts")));
		spyExit.calledWith(0);
	});
});
