import { Identifiers } from "@mainsail/constants";
import { Application, Services } from "@mainsail/kernel";

import { describe } from "@mainsail/test-runner";
import { ServiceProvider } from ".";

describe<{
	app: Application;
	serviceProvider: ServiceProvider;
}>("ServiceProvider", ({ beforeEach, it, assert }) => {
	beforeEach((context) => {
		const app = new Application();
		app.bind(Identifiers.Services.Trigger.Service).to(Services.Triggers.Triggers).inSingletonScope();
		app.bind(Identifiers.Services.Log.Service).toConstantValue({});
		app.bind(Identifiers.Cryptography.Configuration).toConstantValue({});

		context.serviceProvider = app.resolve<ServiceProvider>(ServiceProvider);
		context.app = app;
	});

	it("should register", async (context) => {
		await assert.resolves(() => context.serviceProvider.register());
	});

	it("should boot and dispose", async (context) => {
		await context.serviceProvider.register();

		await assert.resolves(() => context.serviceProvider.boot());
	});
});
