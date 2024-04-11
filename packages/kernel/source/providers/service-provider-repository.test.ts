import { Container } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { describe } from "../../../test-framework/source";
import { Application } from "../application";
import { KernelEvent } from "../enums";
import { MemoryEventDispatcher } from "../services/events";
import { ServiceProvider } from "./service-provider";
import { ServiceProviderRepository } from "./service-provider-repository";

class StubListener implements Contracts.Kernel.EventListener {
	public constructor(private readonly method?) {}

	public handle(): void {
		this.method();
	}
}

class StubServiceProvider extends ServiceProvider {
	public async register(): Promise<void> {}

	public async boot(): Promise<void> {}

	public async dispose(): Promise<void> {}
}

describe<{
	app: Application;
	container: Container;
	serviceProviderRepository: ServiceProviderRepository;
}>("ServiceProviderRepository", ({ assert, beforeEach, it, spy, spyFn }) => {
	beforeEach((context) => {
		context.app = new Application(new Container());

		context.app.bind(Identifiers.Services.EventDispatcher.Service).to(MemoryEventDispatcher).inSingletonScope();

		context.serviceProviderRepository = context.app.get<ServiceProviderRepository>(
			Identifiers.ServiceProvider.Repository,
		);
	});

	it(".all", (context) => {
		const serviceProvider: StubServiceProvider = new StubServiceProvider();
		context.serviceProviderRepository.set("stub", serviceProvider);

		assert.equal(context.serviceProviderRepository.all(), [["stub", serviceProvider]]);
	});

	it(".allLoadedProviders", (context) => {
		const serviceProvider: StubServiceProvider = new StubServiceProvider();
		context.serviceProviderRepository.set("stub", serviceProvider);
		context.serviceProviderRepository.load("stub");

		assert.equal(context.serviceProviderRepository.allLoadedProviders(), [serviceProvider]);
	});

	it(".get", (context) => {
		const serviceProvider: StubServiceProvider = new StubServiceProvider();
		context.serviceProviderRepository.set("stub", serviceProvider);

		assert.equal(context.serviceProviderRepository.get("stub"), serviceProvider);
	});

	it(".set", (context) => {
		assert.false(context.serviceProviderRepository.has("stub"));

		context.serviceProviderRepository.set("stub", new StubServiceProvider());

		assert.true(context.serviceProviderRepository.has("stub"));
	});

	it(".alias should throw if a service provider does not exist", (context) => {
		assert.rejects(
			() => context.serviceProviderRepository.alias("name", "alias"),
			"The service provider [name] is unknown.",
		);
	});

	it(".alias should throw if an alias is already in use", (context) => {
		context.serviceProviderRepository.set("name", new StubServiceProvider());

		context.serviceProviderRepository.alias("name", "alias");

		assert.rejects(
			() => context.serviceProviderRepository.alias("name", "alias"),
			"The alias [alias] is already in use.",
		);
	});

	it(".alias should create an alias", (context) => {
		context.serviceProviderRepository.set("name", new StubServiceProvider());

		assert.rejects(() => context.serviceProviderRepository.get("alias"));

		context.serviceProviderRepository.alias("name", "alias");

		assert.defined(context.serviceProviderRepository.get("alias"));
	});

	it(".loaded", (context) => {
		assert.false(context.serviceProviderRepository.loaded("stub"));

		context.serviceProviderRepository.load("stub");

		assert.true(context.serviceProviderRepository.loaded("stub"));
	});

	it(".failed", (context) => {
		assert.false(context.serviceProviderRepository.failed("stub"));

		context.serviceProviderRepository.fail("stub");

		assert.true(context.serviceProviderRepository.failed("stub"));
	});

	it(".deferred", (context) => {
		assert.false(context.serviceProviderRepository.deferred("stub"));

		context.serviceProviderRepository.defer("stub");

		assert.true(context.serviceProviderRepository.deferred("stub"));
	});

	it(".register", async (context) => {
		const serviceProvider: StubServiceProvider = new StubServiceProvider();
		const spyRegister = spy(serviceProvider, "register");
		context.serviceProviderRepository.set("stub", serviceProvider);

		const fired = spyFn();
		context.app
			.get<MemoryEventDispatcher>(Identifiers.Services.EventDispatcher.Service)
			.listenOnce(KernelEvent.ServiceProviderRegistered, new StubListener(() => fired.call()));

		await context.serviceProviderRepository.register("stub");

		fired.calledOnce();
		spyRegister.calledOnce();
	});

	it(".boot", async (context) => {
		const serviceProvider: StubServiceProvider = new StubServiceProvider();
		const spyBoot = spy(serviceProvider, "boot");
		context.serviceProviderRepository.set("stub", serviceProvider);

		const fired = spyFn();
		context.app
			.get<MemoryEventDispatcher>(Identifiers.Services.EventDispatcher.Service)
			.listenOnce(KernelEvent.ServiceProviderBooted, new StubListener(() => fired.call()));

		await context.serviceProviderRepository.boot("stub");

		fired.calledOnce();
		spyBoot.calledOnce();
		assert.true(context.serviceProviderRepository.loaded("stub"));
		assert.false(context.serviceProviderRepository.failed("stub"));
		assert.false(context.serviceProviderRepository.deferred("stub"));
	});

	it(".dispose", async (context) => {
		const serviceProvider: StubServiceProvider = new StubServiceProvider();
		const spyDispose = spy(serviceProvider, "dispose");
		context.serviceProviderRepository.set("stub", serviceProvider);

		const fired = spyFn();
		context.app
			.get<MemoryEventDispatcher>(Identifiers.Services.EventDispatcher.Service)
			.listenOnce(KernelEvent.ServiceProviderDisposed, new StubListener(() => fired.call()));

		await context.serviceProviderRepository.dispose("stub");

		fired.calledOnce();
		spyDispose.calledOnce();
		assert.false(context.serviceProviderRepository.loaded("stub"));
		assert.false(context.serviceProviderRepository.failed("stub"));
		assert.true(context.serviceProviderRepository.deferred("stub"));
	});
});
