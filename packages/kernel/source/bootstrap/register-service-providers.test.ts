import { Identifiers } from "@mainsail/constants";
import * as Exceptions from "@mainsail/exceptions";

import { describe } from "@mainsail/test-runner";
import {
	InvalidConfigurationServiceProvider,
	RequiredDependencyCanBeFoundServiceProvider,
	RequiredDependencyCannotBeFoundServiceProvider,
	RequiredDependencyVersionCanBeSatisfiedServiceProvider,
	RequiredDependencyVersionCannotBeSatisfiedServiceProvider,
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
			warn: () => {},
		};

		context.app = new Application();
		context.app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue(new MemoryEventDispatcher());
		context.app.bind(Identifiers.Services.Log.Service).toConstantValue(context.logger);
		context.app.bind(Identifiers.Services.Filesystem.Service).toConstantValue({ existsSync: () => true });

		context.serviceProviderRepository = context.app.get<ServiceProviderRepository>(
			Identifiers.ServiceProvider.Repository,
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
		assert.equal(serviceProvider.config().getRequired("username"), "johndoe");
	});

	it("should throw if the configuration validation fails", async (context) => {
		const serviceProvider: ServiceProvider = new InvalidConfigurationServiceProvider();
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

	it("should terminate if a required dependency cannot be found", async (context) => {
		const serviceProvider: ServiceProvider = new RequiredDependencyCannotBeFoundServiceProvider();
		serviceProvider.setManifest(context.app.resolve(PluginManifest));
		serviceProvider.setConfig(context.app.resolve(PluginConfiguration));
		context.serviceProviderRepository.set("stub", serviceProvider);

		const spyTerminate = stub(context.app, "terminate");
		await context.app.resolve<RegisterServiceProviders>(RegisterServiceProviders).bootstrap();

		spyTerminate.calledOnce();
		spyTerminate.calledWith(
			'The "deps-required" package is missing. Please, make sure to install this library to take advantage of stub.',
		);
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

	it("should terminate if a required dependency cannot satisfy the version", async (context) => {
		const serviceProvider: ServiceProvider = new RequiredDependencyVersionCannotBeSatisfiedServiceProvider();
		serviceProvider.setManifest(context.app.resolve(PluginManifest));
		serviceProvider.setConfig(context.app.resolve(PluginConfiguration));
		context.serviceProviderRepository.set("stub", serviceProvider);
		context.serviceProviderRepository.set("dep", new StubServiceProvider());

		const spyTerminate = stub(context.app, "terminate");
		await context.app.resolve<RegisterServiceProviders>(RegisterServiceProviders).bootstrap();

		spyTerminate.calledOnce();
		spyTerminate.calledWith('Expected "dep" to satisfy ">=2.0.0" but received "1.0.0".');
	});
});
