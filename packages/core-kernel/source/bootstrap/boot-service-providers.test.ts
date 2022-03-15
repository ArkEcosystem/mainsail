import { describe } from "../../../../core-test-framework";
import {
	DeferredBootServiceProvider,
	DeferredDisposeServiceProvider,
	DeferredServiceProvider,
	FaultyBootServiceProvider,
	RequiredFaultyBootServiceProvider,
} from "../../../test/stubs/bootstrap/service-providers";
import { Application } from "../../application";
import { BlockEvent, KernelEvent } from "../../enums";
import { ServiceProviderCannotBeBooted } from "../../exceptions/plugins";
import { Container, Identifiers } from "../../ioc";
import { ServiceProvider, ServiceProviderRepository } from "../../providers";
import { MemoryEventDispatcher } from "../../services/events";
import { BootServiceProviders } from "./boot-service-providers";

describe<{
	app: Application;
	serviceProviderRepository: ServiceProviderRepository;
	logger: Record<string, any>;
}>("BootServiceProviders", ({ afterEach, assert, beforeEach, it, spy }) => {
	beforeEach((context) => {
		context.logger = {
			notice: () => undefined,
			warning: () => undefined,
			error: () => undefined,
		};

		context.app = new Application(new Container());
		context.app.bind(Identifiers.EventDispatcherService).to(MemoryEventDispatcher).inSingletonScope();
		context.app.bind(Identifiers.LogService).toConstantValue(context.logger);

		context.serviceProviderRepository = context.app.get<ServiceProviderRepository>(
			Identifiers.ServiceProviderRepository,
		);
	});

	afterEach(() => {
		delete process.env.DEFFERED_ENABLE;
		delete process.env.DEFFERED_DISABLE;
	});

	it("RequiredFaultyBootServiceProvider", async (context) => {
		const bootServiceProviders = context.app.resolve<BootServiceProviders>(BootServiceProviders);

		const serviceProvider: ServiceProvider = new RequiredFaultyBootServiceProvider();
		context.serviceProviderRepository.set("stub", serviceProvider);

		await assert.rejects(() => bootServiceProviders.bootstrap(), ServiceProviderCannotBeBooted, "Boot Error");
	});

	it("FaultyBootServiceProvider", async (context) => {
		const bootServiceProviders = context.app.resolve<BootServiceProviders>(BootServiceProviders);

		const serviceProvider: ServiceProvider = new FaultyBootServiceProvider();
		const spyBoot = spy(serviceProvider, "boot");
		context.serviceProviderRepository.set("stub", serviceProvider);

		await assert.resolves(() => bootServiceProviders.bootstrap());

		spyBoot.calledOnce();
	});

	it("DeferredServiceProvider", async (context) => {
		const bootServiceProviders = context.app.resolve<BootServiceProviders>(BootServiceProviders);

		const serviceProvider: ServiceProvider = new DeferredServiceProvider();
		const spyBoot = spy(serviceProvider, "boot");

		context.serviceProviderRepository.set("stub", serviceProvider);

		await assert.resolves(() => bootServiceProviders.bootstrap());

		spyBoot.neverCalled();
		assert.true(context.serviceProviderRepository.deferred("stub"));
	});

	it("DeferredServiceProvider - failed", async (context) => {
		const bootServiceProviders = context.app.resolve<BootServiceProviders>(BootServiceProviders);

		const serviceProvider: ServiceProvider = new DeferredServiceProvider();
		const spyBoot = spy(serviceProvider, "boot");

		context.serviceProviderRepository.set("stub", serviceProvider);

		await assert.resolves(() => bootServiceProviders.bootstrap());

		spyBoot.neverCalled();

		context.serviceProviderRepository.fail("stub");

		await assert.resolves(() =>
			context.app.get<MemoryEventDispatcher>(Identifiers.EventDispatcherService).dispatch(BlockEvent.Applied),
		);

		spyBoot.neverCalled();
		assert.true(context.serviceProviderRepository.deferred("stub"));
	});

	it("DeferredServiceProvider - bootWhen should react to [BlockEvent.Applied]", async (context) => {
		const bootServiceProviders = context.app.resolve<BootServiceProviders>(BootServiceProviders);

		const serviceProvider: ServiceProvider = new DeferredServiceProvider();
		const spyBoot = spy(serviceProvider, "boot");

		context.serviceProviderRepository.set("stub", serviceProvider);

		await assert.resolves(() => bootServiceProviders.bootstrap());

		context.serviceProviderRepository.defer("stub");

		process.env.DEFFERED_ENABLE = "true";

		await context.app.get<MemoryEventDispatcher>(Identifiers.EventDispatcherService).dispatch(BlockEvent.Applied);

		spyBoot.calledOnce();
	});

	it("DeferredServiceProvider - bootWhen should react to [KernelEvent.ServiceProviderBooted]", async (context) => {
		const bootServiceProviders = context.app.resolve<BootServiceProviders>(BootServiceProviders);

		const serviceProvider: ServiceProvider = new DeferredServiceProvider();
		const spyBoot = spy(serviceProvider, "boot");

		context.serviceProviderRepository.set("stub", serviceProvider);

		await assert.resolves(() => bootServiceProviders.bootstrap());

		context.serviceProviderRepository.defer("stub");

		process.env.DEFFERED_ENABLE = "true";

		await context.app
			.get<MemoryEventDispatcher>(Identifiers.EventDispatcherService)
			.dispatch(KernelEvent.ServiceProviderBooted, { name: "another-stub" });

		spyBoot.calledOnce();
	});

	it("DeferredServiceProvider - bootWhen should not react to [KernelEvent.ServiceProviderBooted] if the booted provider is self", async (context) => {
		const bootServiceProviders = context.app.resolve<BootServiceProviders>(BootServiceProviders);

		const serviceProvider: ServiceProvider = new DeferredServiceProvider();
		const spyBoot = spy(serviceProvider, "boot");

		context.serviceProviderRepository.set("stub", serviceProvider);

		process.env.DEFFERED_ENABLE = "false";

		await assert.resolves(() => bootServiceProviders.bootstrap());

		context.serviceProviderRepository.defer("stub");

		process.env.DEFFERED_ENABLE = "true";

		await context.app
			.get<MemoryEventDispatcher>(Identifiers.EventDispatcherService)
			.dispatch(KernelEvent.ServiceProviderBooted, { name: "stub" });

		spyBoot.neverCalled();
	});

	it("DeferredServiceProvider - bootWhen should react if the service provider does match the expected provider", async (context) => {
		const bootServiceProviders = context.app.resolve<BootServiceProviders>(BootServiceProviders);

		const serviceProvider: ServiceProvider = new DeferredBootServiceProvider();
		const spyBoot = spy(serviceProvider, "boot");

		context.serviceProviderRepository.set("stub", serviceProvider);

		process.env.DEFFERED_ENABLE = "false";

		await assert.resolves(() => bootServiceProviders.bootstrap());

		context.serviceProviderRepository.defer("stub");

		process.env.DEFFERED_ENABLE = "true";

		await context.app
			.get<MemoryEventDispatcher>(Identifiers.EventDispatcherService)
			.dispatch(KernelEvent.ServiceProviderBooted, { name: "expected-stub" });

		spyBoot.calledOnce();
	});

	it("DeferredServiceProvider - bootWhen should not react if the service provider does not match the expected provider", async (context) => {
		const bootServiceProviders = context.app.resolve<BootServiceProviders>(BootServiceProviders);

		const serviceProvider: ServiceProvider = new DeferredBootServiceProvider();
		const spyBoot = spy(serviceProvider, "boot");

		context.serviceProviderRepository.set("stub", serviceProvider);

		await assert.resolves(() => bootServiceProviders.bootstrap());

		context.serviceProviderRepository.defer("stub");

		process.env.DEFFERED_ENABLE = "true";

		await context.app
			.get<MemoryEventDispatcher>(Identifiers.EventDispatcherService)
			.dispatch(KernelEvent.ServiceProviderBooted, { name: "another-stub" });

		spyBoot.neverCalled();
	});

	it("DeferredServiceProvider - disposeWhen should react to [BlockEvent.Applied]", async (context) => {
		const bootServiceProviders = context.app.resolve<BootServiceProviders>(BootServiceProviders);

		const serviceProvider: ServiceProvider = new DeferredServiceProvider();
		const spyDispose = spy(serviceProvider, "dispose");
		context.serviceProviderRepository.set("stub", serviceProvider);

		await assert.resolves(() => bootServiceProviders.bootstrap());

		context.serviceProviderRepository.load("stub");

		process.env.DEFFERED_DISABLE = "true";

		await context.app.get<MemoryEventDispatcher>(Identifiers.EventDispatcherService).dispatch(BlockEvent.Applied);

		spyDispose.calledOnce();
	});

	it("DeferredServiceProvider - disposeWhen should react to [KernelEvent.ServiceProviderBooted]", async (context) => {
		const bootServiceProviders = context.app.resolve<BootServiceProviders>(BootServiceProviders);

		const serviceProvider: ServiceProvider = new DeferredServiceProvider();
		const spyDispose = spy(serviceProvider, "dispose");
		context.serviceProviderRepository.set("stub", serviceProvider);

		await assert.resolves(() => bootServiceProviders.bootstrap());

		context.serviceProviderRepository.load("stub");

		process.env.DEFFERED_DISABLE = "true";

		await context.app
			.get<MemoryEventDispatcher>(Identifiers.EventDispatcherService)
			.dispatch(KernelEvent.ServiceProviderBooted, { name: "another-stub" });

		spyDispose.calledOnce();
	});

	it("DeferredServiceProvider - disposeWhen should not react to [KernelEvent.ServiceProviderBooted] if the booted provider is self", async (context) => {
		const bootServiceProviders = context.app.resolve<BootServiceProviders>(BootServiceProviders);

		const serviceProvider: ServiceProvider = new DeferredServiceProvider();
		const spyDispose = spy(serviceProvider, "dispose");
		context.serviceProviderRepository.set("stub", serviceProvider);

		await assert.resolves(() => bootServiceProviders.bootstrap());

		context.serviceProviderRepository.defer("stub");

		process.env.DEFFERED_ENABLE = "true";

		await context.app
			.get<MemoryEventDispatcher>(Identifiers.EventDispatcherService)
			.dispatch(KernelEvent.ServiceProviderBooted, { name: "stub" });

		spyDispose.neverCalled();
	});

	it("DeferredServiceProvider - disposeWhen should react if the service provider does match the expected provider", async (context) => {
		const bootServiceProviders = context.app.resolve<BootServiceProviders>(BootServiceProviders);

		const serviceProvider: ServiceProvider = new DeferredDisposeServiceProvider();
		const spyDispose = spy(serviceProvider, "dispose");
		context.serviceProviderRepository.set("stub", serviceProvider);

		process.env.DEFFERED_ENABLE = "false";

		await assert.resolves(() => bootServiceProviders.bootstrap());

		context.serviceProviderRepository.defer("stub");

		process.env.DEFFERED_DISABLE = "true";

		await context.app
			.get<MemoryEventDispatcher>(Identifiers.EventDispatcherService)
			.dispatch(KernelEvent.ServiceProviderBooted, { name: "expected-stub" });

		spyDispose.calledOnce();
	});

	it("DeferredServiceProvider - disposeWhen should not react if the service provider does not match the expected provider", async (context) => {
		const bootServiceProviders = context.app.resolve<BootServiceProviders>(BootServiceProviders);

		const serviceProvider: ServiceProvider = new DeferredDisposeServiceProvider();
		const spyDispose = spy(serviceProvider, "dispose");
		context.serviceProviderRepository.set("stub", serviceProvider);

		await assert.resolves(() => bootServiceProviders.bootstrap());

		context.serviceProviderRepository.defer("stub");

		process.env.DEFFERED_ENABLE = "true";

		await context.app
			.get<MemoryEventDispatcher>(Identifiers.EventDispatcherService)
			.dispatch(KernelEvent.ServiceProviderBooted, { name: "another-stub" });

		spyDispose.neverCalled();
	});
});
