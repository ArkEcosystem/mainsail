import { resolve } from "path";
import { describe } from "../../../../core-test-framework";

import { Application } from "../../application";
import { LoadServiceProviders } from "./load-service-providers";
import { Container, Identifiers } from "../../ioc";
import { ServiceProvider, ServiceProviderRepository } from "../../providers";
import { ConfigRepository } from "../../services/config";
import { MemoryEventDispatcher } from "../../services/events";

class StubServiceProvider extends ServiceProvider {
	public async register(): Promise<void> {}
}

describe<{
	app: Application;
	configRepository: ConfigRepository;
	serviceProviderRepository: ServiceProviderRepository;
}>("LoadServiceProviders", ({ assert, beforeEach, it, stub }) => {
	beforeEach((context) => {
		context.app = new Application(new Container());
		context.app.bind(Identifiers.EventDispatcherService).to(MemoryEventDispatcher).inSingletonScope();

		context.configRepository = context.app.get<ConfigRepository>(Identifiers.ConfigRepository);
		context.serviceProviderRepository = context.app.get<ServiceProviderRepository>(
			Identifiers.ServiceProviderRepository,
		);
	});

	it("should bootstrap with defaults", async (context) => {
		stub(context.app, "dataPath").returnValue(resolve(__dirname, "../../../test/stubs"));

		context.configRepository.merge({
			app: { plugins: [{ package: "stub-plugin-with-defaults" }] },
		});

		context.serviceProviderRepository.set("stub", new StubServiceProvider());

		await assert.resolves(() => context.app.resolve<LoadServiceProviders>(LoadServiceProviders).bootstrap());
	});

	it("should bootstrap without defaults", async (context) => {
		stub(context.app, "dataPath").returnValue(resolve(__dirname, "../../../test/stubs"));

		context.configRepository.merge({
			app: { plugins: [{ package: "stub-plugin" }] },
		});

		context.serviceProviderRepository.set("stub", new StubServiceProvider());

		await assert.resolves(() => context.app.resolve<LoadServiceProviders>(LoadServiceProviders).bootstrap());
	});

	it("should throw if package doesn't exist", async (context) => {
		stub(context.app, "dataPath").returnValue(resolve(__dirname, "../../../test/stubs"));

		context.configRepository.merge({
			app: { plugins: [{ package: "non-existing-plugin" }] },
		});

		await assert.rejects(
			() => context.app.resolve<LoadServiceProviders>(LoadServiceProviders).bootstrap(),
			"Cannot find module 'non-existing-plugin'",
		);
	});

	it("should bootstrap if plugins path doesn't exist", async (context) => {
		stub(context.app, "dataPath").returnValue("/invalid/path");

		context.configRepository.merge({
			app: { plugins: [] },
		});

		await assert.resolves(() => context.app.resolve<LoadServiceProviders>(LoadServiceProviders).bootstrap());
	});
});
