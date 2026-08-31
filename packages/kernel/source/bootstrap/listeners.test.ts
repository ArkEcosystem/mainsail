import { Events, Identifiers } from "@mainsail/constants";
import { describe } from "@mainsail/test-runner";

import { Application } from "../application";
import { ChangeServiceProviderState } from "./listeners";

describe<{
	app: Application;
	serviceProviders: Record<string, any>;
	serviceProvider: Record<string, any>;
	listener: ChangeServiceProviderState;
}>("ChangeServiceProviderState", ({ assert, beforeEach, it, spy }) => {
	beforeEach((context) => {
		context.serviceProviders = {
			boot: async () => {},
			deferred: () => false,
			dispose: async () => {},
			failed: () => false,
			loaded: () => false,
		};
		context.serviceProvider = {
			bootWhen: async () => false,
			disposeWhen: async () => false,
			name: () => "stub",
		};

		context.app = new Application();
		context.app.rebind(Identifiers.ServiceProvider.Repository).toConstantValue(context.serviceProviders);

		context.listener = context.app
			.resolve(ChangeServiceProviderState)
			.initialize("stub", context.serviceProvider as any);
	});

	it("should dispose a loaded provider on [BlockEvent.Applied] when disposeWhen resolves true", async ({
		listener,
		serviceProviders,
		serviceProvider,
	}) => {
		serviceProviders.loaded = () => true;
		serviceProvider.disposeWhen = async () => true;
		const spyDispose = spy(serviceProviders, "dispose");

		await listener.handle({ data: { name: "" }, name: Events.BlockEvent.Applied });

		spyDispose.calledWith("stub");
	});

	it("should boot a deferred provider on [BlockEvent.Applied] when bootWhen resolves true", async ({
		listener,
		serviceProviders,
		serviceProvider,
	}) => {
		serviceProviders.deferred = () => true;
		serviceProvider.bootWhen = async () => true;
		const spyBoot = spy(serviceProviders, "boot");

		await listener.handle({ data: { name: "" }, name: Events.BlockEvent.Applied });

		spyBoot.calledWith("stub");
	});

	it("should do nothing when the provider has failed", async ({ listener, serviceProviders, serviceProvider }) => {
		serviceProviders.failed = () => true;
		serviceProviders.loaded = () => true;
		serviceProviders.deferred = () => true;
		serviceProvider.bootWhen = async () => true;
		serviceProvider.disposeWhen = async () => true;
		const spyBoot = spy(serviceProviders, "boot");
		const spyDispose = spy(serviceProviders, "dispose");

		await listener.handle({ data: { name: "" }, name: Events.BlockEvent.Applied });

		spyBoot.neverCalled();
		spyDispose.neverCalled();
	});

	it("should ignore [ServiceProviderBooted] dispatched by itself", async ({ listener, serviceProviders }) => {
		const spyFailed = spy(serviceProviders, "failed");

		await listener.handle({ data: { name: "stub" }, name: Events.KernelEvent.ServiceProviderBooted });

		spyFailed.neverCalled();
	});

	it("should react to [ServiceProviderBooted] from another provider and pass it as previous", async ({
		listener,
		serviceProviders,
		serviceProvider,
	}) => {
		serviceProviders.deferred = () => true;
		serviceProvider.bootWhen = async () => true;
		const spyBootWhen = spy(serviceProvider, "bootWhen");
		const spyBoot = spy(serviceProviders, "boot");

		await listener.handle({ data: { name: "other" }, name: Events.KernelEvent.ServiceProviderBooted });

		spyBootWhen.calledWith("other");
		spyBoot.calledWith("stub");
	});
});
