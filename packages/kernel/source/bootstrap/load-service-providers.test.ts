import { Container } from "@mainsail/container";
import { Identifiers } from "@mainsail/contracts";
import { readJSONSync } from "fs-extra/esm";
import { resolve } from "path";

import { describeSkip } from "../../../test-framework/source";
import { Application } from "../application";
import { ServiceProvider, ServiceProviderRepository } from "../providers";
import { ConfigRepository } from "../services/config";
import { MemoryEventDispatcher } from "../services/events";
import { LoadServiceProviders } from "./load-service-providers";

class StubServiceProvider extends ServiceProvider {
	public async register(): Promise<void> {}
}

describeSkip<{
	app: Application;
	configRepository: ConfigRepository;
	serviceProviderRepository: ServiceProviderRepository;
}>("LoadServiceProviders", ({ assert, beforeEach, it, stub }) => {
	beforeEach((context) => {
		context.app = new Application(new Container());
		context.app.bind(Identifiers.Services.EventDispatcher.Service).to(MemoryEventDispatcher).inSingletonScope();
		context.app
			.bind(Identifiers.Services.Filesystem.Service)
			.toConstantValue({ existsSync: () => true, readJSONSync: (path: string) => readJSONSync(path) });

		context.configRepository = context.app.get<ConfigRepository>(Identifiers.Config.Repository);
		context.serviceProviderRepository = context.app.get<ServiceProviderRepository>(
			Identifiers.ServiceProvider.Repository,
		);
	});

	it("should bootstrap with defaults", async (context) => {
		stub(context.app, "dataPath").returnValue(resolve(new URL(".", import.meta.url).pathname, "../../test/stubs"));

		context.configRepository.merge({
			app: { plugins: [{ package: "stub-plugin-with-defaults" }] },
		});

		context.serviceProviderRepository.set("stub", new StubServiceProvider());

		await assert.resolves(() => context.app.resolve<LoadServiceProviders>(LoadServiceProviders).bootstrap());
	});

	it("should bootstrap without defaults", async (context) => {
		stub(context.app, "dataPath").returnValue(resolve(new URL(".", import.meta.url).pathname, "../../test/stubs"));

		context.configRepository.merge({
			app: { plugins: [{ package: "stub-plugin" }] },
		});

		context.serviceProviderRepository.set("stub", new StubServiceProvider());

		await assert.resolves(() => context.app.resolve<LoadServiceProviders>(LoadServiceProviders).bootstrap());
	});

	it("should throw if package doesn't exist", async (context) => {
		stub(context.app, "dataPath").returnValue(resolve(new URL(".", import.meta.url).pathname, "../../test/stubs"));

		context.configRepository.merge({
			app: { plugins: [{ package: "non-existing-plugin" }] },
		});

		await assert.rejects(
			() => context.app.resolve<LoadServiceProviders>(LoadServiceProviders).bootstrap(),
			"non-existing-plugin",
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
