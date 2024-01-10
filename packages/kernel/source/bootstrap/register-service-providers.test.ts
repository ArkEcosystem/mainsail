import { Container } from "@mainsail/container";
import { Exceptions, Identifiers } from "@mainsail/contracts";

import { describe } from "../../../test-framework";
import {
	InvalidConfigurationServiceProvider,
	OptionalDependencyCannotBeFoundServiceProvider,
	OptionalDependencyVersionCannotBeSatisfiedServiceProvider,
	RequiredDependencyCanBeFoundServiceProvider,
	RequiredDependencyCannotBeFoundAsyncServiceProvider,
	RequiredDependencyCannotBeFoundServiceProvider,
	RequiredDependencyVersionCanBeSatisfiedServiceProvider,
	RequiredDependencyVersionCannotBeSatisfiedServiceProvider,
	RequiredInvalidConfigurationServiceProvider,
	StubServiceProvider,
	ValidConfigurationServiceProvider,
} from "../../test/stubs/bootstrap/service-providers";
import { Application } from "../application";
import { PluginConfiguration, PluginManifest, ServiceProvider, ServiceProviderRepository } from "../providers";
import { MemoryEventDispatcher } from "../services/events";
import { ServiceProvider as ValidationServiceProvider } from "../services/validation";
import { RegisterServiceProviders } from "./register-service-providers";

describe<{
	app: Application;
	serviceProviderRepository: ServiceProviderRepository;
	logger: Record<string, any>;
}>("RegisterServiceProviders", ({ assert, beforeEach, it, spy, stub }) => {
	beforeEach((context) => {
		context.logger = {
			error: () => {},
			notice: () => {},
			warning: () => {},
		};

		context.app = new Application(new Container());
		context.app.bind(Identifiers.Kernel.EventDispatcher.Service).toConstantValue(new MemoryEventDispatcher());
		context.app.bind(Identifiers.Kernel.Log.Service).toConstantValue(context.logger);

		context.serviceProviderRepository = context.app.get<ServiceProviderRepository>(
			Identifiers.ServiceProviderRepository,
		);
	});

	it("should bootstrap with a basic service provider", async (context) => {
		const serviceProvider: ServiceProvider = new StubServiceProvider();
		const spyRegister = spy(serviceProvider, "register");
		context.serviceProviderRepository.set("stub", serviceProvider);

		await context.app.resolve<RegisterServiceProviders>(RegisterServiceProviders).bootstrap();

		spyRegister.calledOnce();
	});

	it("should bootstrap if the configuration validation passes", async (context) => {
		const serviceProvider: ServiceProvider = new ValidConfigurationServiceProvider();
		serviceProvider.setManifest(context.app.resolve(PluginManifest));

		const packageConfiguration: PluginConfiguration = context.app.resolve(PluginConfiguration);
		packageConfiguration.set("username", "johndoe");
		serviceProvider.setConfig(packageConfiguration);

		const spyRegister = spy(serviceProvider, "register");
		context.serviceProviderRepository.set("stub", serviceProvider);

		await context.app.resolve<ValidationServiceProvider>(ValidationServiceProvider).register();
		await context.app.resolve<RegisterServiceProviders>(RegisterServiceProviders).bootstrap();

		spyRegister.calledOnce();
		assert.false(context.serviceProviderRepository.failed("stub"));
		assert.equal(serviceProvider.config().get("username"), "johndoe");
	});

	it("should mark the service provider as failed if the configuration validation fails", async (context) => {
		const serviceProvider: ServiceProvider = new InvalidConfigurationServiceProvider();
		serviceProvider.setManifest(context.app.resolve(PluginManifest));
		serviceProvider.setConfig(context.app.resolve(PluginConfiguration));

		const spyRegister = spy(serviceProvider, "register");
		context.serviceProviderRepository.set("stub", serviceProvider);

		await context.app.resolve<ValidationServiceProvider>(ValidationServiceProvider).register();
		await context.app.resolve<RegisterServiceProviders>(RegisterServiceProviders).bootstrap();

		spyRegister.neverCalled();
		assert.true(context.serviceProviderRepository.failed("stub"));
	});

	it("should throw if the service provider is required and the configuration validation fails", async (context) => {
		const serviceProvider: ServiceProvider = new RequiredInvalidConfigurationServiceProvider();
		serviceProvider.setManifest(context.app.resolve(PluginManifest));
		serviceProvider.setConfig(context.app.resolve(PluginConfiguration));
		context.serviceProviderRepository.set("stub", serviceProvider);

		await context.app.resolve<ValidationServiceProvider>(ValidationServiceProvider).register();

		await assert.rejects(
			() => context.app.resolve<RegisterServiceProviders>(RegisterServiceProviders).bootstrap(),
			Exceptions.ServiceProviderCannotBeRegistered,
			'[stub] Failed to register: "[stub] Failed to validate the configuration: "{\n' +
				'    "username": [\n' +
				'        "\\"username\\" is required"\n' +
				"    ]\n" +
				'}".".',
		);
	});

	it.skip("should terminate if a required (boolean) dependency cannot be found", async (context) => {
		const serviceProvider: ServiceProvider = new RequiredDependencyCannotBeFoundServiceProvider();
		serviceProvider.setManifest(context.app.resolve(PluginManifest));
		serviceProvider.setConfig(context.app.resolve(PluginConfiguration));
		context.serviceProviderRepository.set("stub", serviceProvider);

		const spyExit = stub(process, "exit");
		const spyError = spy(context.logger, "error");
		await context.app.resolve<RegisterServiceProviders>(RegisterServiceProviders).bootstrap();

		spyError.calledWith(
			'The "deps-required" package is required but missing. Please, make sure to install this library to take advantage of stub.',
		);
		spyExit.calledOnce();
	});

	it("should bootstrap if a required dependency can be found", async (context) => {
		const serviceProvider: ServiceProvider = new RequiredDependencyCanBeFoundServiceProvider();
		serviceProvider.setManifest(context.app.resolve(PluginManifest));
		serviceProvider.setConfig(context.app.resolve(PluginConfiguration));
		context.serviceProviderRepository.set("stub", serviceProvider);
		context.serviceProviderRepository.set("dep", new StubServiceProvider());

		const spyExit = spy(process, "exit");
		const spyTerminate = spy(context.app, "terminate");
		await context.app.resolve<RegisterServiceProviders>(RegisterServiceProviders).bootstrap();

		assert.false(context.serviceProviderRepository.failed("stub"));
		spyExit.neverCalled();
		spyTerminate.neverCalled();
	});

	it.skip("should terminate if a required (async) dependency cannot be found", async (context) => {
		const serviceProvider: ServiceProvider = new RequiredDependencyCannotBeFoundAsyncServiceProvider();
		serviceProvider.setManifest(context.app.resolve(PluginManifest));
		serviceProvider.setConfig(context.app.resolve(PluginConfiguration));
		context.serviceProviderRepository.set("stub", serviceProvider);

		const spyExit = stub(process, "exit");
		const spyError = spy(context.logger, "error");
		const spyTerminate = spy(context.app, "terminate");
		await context.app.resolve<RegisterServiceProviders>(RegisterServiceProviders).bootstrap();

		spyError.calledWith(
			'The "deps-required" package is required but missing. Please, make sure to install this library to take advantage of stub.',
		);
		spyTerminate.calledOnce();
		spyExit.calledOnce();
	});

	it("should mark the service provider as failed and log a warning if an optional dependency cannot be found", async (context) => {
		const serviceProvider: ServiceProvider = new OptionalDependencyCannotBeFoundServiceProvider();
		serviceProvider.setManifest(context.app.resolve(PluginManifest));
		serviceProvider.setConfig(context.app.resolve(PluginConfiguration));
		context.serviceProviderRepository.set("stub", serviceProvider);

		const spyWarning = spy(context.logger, "warning");
		await context.app.resolve<RegisterServiceProviders>(RegisterServiceProviders).bootstrap();

		spyWarning.calledWith(
			'The "deps-optional" package is missing. Please, make sure to install this library to take advantage of stub.',
		);
		assert.true(context.serviceProviderRepository.failed("stub"));
	});

	it("should bootstrap if a required dependency can satisfy the version", async (context) => {
		const serviceProvider: ServiceProvider = new RequiredDependencyVersionCanBeSatisfiedServiceProvider();
		serviceProvider.setManifest(context.app.resolve(PluginManifest));
		serviceProvider.setConfig(context.app.resolve(PluginConfiguration));
		context.serviceProviderRepository.set("stub", serviceProvider);
		context.serviceProviderRepository.set("dep", new StubServiceProvider());

		const spyExit = stub(process, "exit");
		const spyTerminate = spy(context.app, "terminate");
		await context.app.resolve<RegisterServiceProviders>(RegisterServiceProviders).bootstrap();

		assert.false(context.serviceProviderRepository.failed("stub"));
		spyExit.neverCalled();
		spyTerminate.neverCalled();
	});

	it.skip("should terminate if a required dependency cannot satisfy the version", async (context) => {
		const serviceProvider: ServiceProvider = new RequiredDependencyVersionCannotBeSatisfiedServiceProvider();
		serviceProvider.setManifest(context.app.resolve(PluginManifest));
		serviceProvider.setConfig(context.app.resolve(PluginConfiguration));
		context.serviceProviderRepository.set("stub", serviceProvider);
		context.serviceProviderRepository.set("dep", new StubServiceProvider());

		const spyExit = stub(process, "exit");
		const spyError = spy(context.logger, "error");
		const spyTerminate = spy(context.app, "terminate");
		await context.app.resolve<RegisterServiceProviders>(RegisterServiceProviders).bootstrap();

		spyError.calledWith('Expected "dep" to satisfy ">=2.0.0" but received "1.0.0".');
		spyTerminate.calledOnce();
		spyExit.calledOnce();
	});

	it("should mark the service provider as failed and log a warning if an optional dependency cannot satisfy the version", async (context) => {
		const serviceProvider: ServiceProvider = new OptionalDependencyVersionCannotBeSatisfiedServiceProvider();
		serviceProvider.setManifest(context.app.resolve(PluginManifest));
		serviceProvider.setConfig(context.app.resolve(PluginConfiguration));
		context.serviceProviderRepository.set("stub", serviceProvider);
		context.serviceProviderRepository.set("dep", new StubServiceProvider());

		const spyWarning = spy(context.logger, "warning");
		await context.app.resolve<RegisterServiceProviders>(RegisterServiceProviders).bootstrap();

		spyWarning.calledWith('Expected "dep" to satisfy ">=2.0.0" but received "1.0.0".');
		assert.true(context.serviceProviderRepository.failed("stub"));
	});
});
