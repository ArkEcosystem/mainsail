import { describe } from "../../../../core-test-framework";
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
} from "../../../test/stubs/bootstrap/service-providers";
import { Application } from "../../application";
import { ServiceProviderCannotBeRegistered } from "../../exceptions/plugins";
import { Container, Identifiers } from "../../ioc";
import { PluginConfiguration, PluginManifest, ServiceProvider, ServiceProviderRepository } from "../../providers";
import { MemoryEventDispatcher } from "../../services/events";
import { ServiceProvider as ValidationServiceProvider } from "../../services/validation";
import { RegisterServiceProviders } from "./register-service-providers";

describe<{
	app: Application;
	serviceProviderRepository: ServiceProviderRepository;
	logger: Record<string, any>;
}>("RegisterServiceProviders", ({ assert, beforeEach, it, spy }) => {
	beforeEach((context) => {
		context.logger = {
			notice: () => undefined,
			warning: () => undefined,
		};

		context.app = new Application(new Container());
		context.app.bind(Identifiers.EventDispatcherService).toConstantValue(new MemoryEventDispatcher());
		context.app.bind(Identifiers.LogService).toConstantValue(context.logger);

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
			ServiceProviderCannotBeRegistered,
			'[stub] Failed to register: "[stub] Failed to validate the configuration: "{\n' +
				'    "username": [\n' +
				'        "\\"username\\" is required"\n' +
				"    ]\n" +
				'}".".',
		);
	});

	it("should terminate if a required (boolean) dependency cannot be found", async (context) => {
		const serviceProvider: ServiceProvider = new RequiredDependencyCannotBeFoundServiceProvider();
		serviceProvider.setManifest(context.app.resolve(PluginManifest));
		serviceProvider.setConfig(context.app.resolve(PluginConfiguration));
		context.serviceProviderRepository.set("stub", serviceProvider);

		const spyNotice = spy(context.logger, "notice");
		await context.app.resolve<RegisterServiceProviders>(RegisterServiceProviders).bootstrap();

		spyNotice.calledWith(
			'The "deps-required" package is required but missing. Please, make sure to install this library to take advantage of stub.',
		);
	});

	it("should bootstrap if a required dependency can be found", async (context) => {
		const serviceProvider: ServiceProvider = new RequiredDependencyCanBeFoundServiceProvider();
		serviceProvider.setManifest(context.app.resolve(PluginManifest));
		serviceProvider.setConfig(context.app.resolve(PluginConfiguration));
		context.serviceProviderRepository.set("stub", serviceProvider);
		context.serviceProviderRepository.set("dep", new StubServiceProvider());

		const spyNotice = spy(context.logger, "notice");
		const spyTerminate = spy(context.app, "terminate");
		await context.app.resolve<RegisterServiceProviders>(RegisterServiceProviders).bootstrap();

		assert.false(context.serviceProviderRepository.failed("stub"));
		spyNotice.neverCalled();
		spyTerminate.neverCalled();
	});

	it("should terminate if a required (async) dependency cannot be found", async (context) => {
		const serviceProvider: ServiceProvider = new RequiredDependencyCannotBeFoundAsyncServiceProvider();
		serviceProvider.setManifest(context.app.resolve(PluginManifest));
		serviceProvider.setConfig(context.app.resolve(PluginConfiguration));
		context.serviceProviderRepository.set("stub", serviceProvider);

		const spyNotice = spy(context.logger, "notice");
		const spyTerminate = spy(context.app, "terminate");
		await context.app.resolve<RegisterServiceProviders>(RegisterServiceProviders).bootstrap();

		spyNotice.calledWith(
			'The "deps-required" package is required but missing. Please, make sure to install this library to take advantage of stub.',
		);
		spyTerminate.calledOnce();
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

		const spyNotice = spy(context.logger, "notice");
		const spyTerminate = spy(context.app, "terminate");
		await context.app.resolve<RegisterServiceProviders>(RegisterServiceProviders).bootstrap();

		assert.false(context.serviceProviderRepository.failed("stub"));
		spyNotice.neverCalled();
		spyTerminate.neverCalled();
	});

	it("should terminate if a required dependency cannot satisfy the version", async (context) => {
		const serviceProvider: ServiceProvider = new RequiredDependencyVersionCannotBeSatisfiedServiceProvider();
		serviceProvider.setManifest(context.app.resolve(PluginManifest));
		serviceProvider.setConfig(context.app.resolve(PluginConfiguration));
		context.serviceProviderRepository.set("stub", serviceProvider);
		context.serviceProviderRepository.set("dep", new StubServiceProvider());

		const spyNotice = spy(context.logger, "notice");
		const spyTerminate = spy(context.app, "terminate");
		await context.app.resolve<RegisterServiceProviders>(RegisterServiceProviders).bootstrap();

		spyNotice.calledWith('Expected "dep" to satisfy ">=2.0.0" but received "1.0.0".');
		spyTerminate.calledOnce();
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
