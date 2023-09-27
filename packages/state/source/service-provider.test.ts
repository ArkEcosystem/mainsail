import { Container } from "@mainsail/container";
import { Identifiers } from "@mainsail/contracts";
import { Application, Services } from "@mainsail/kernel";
import importFresh from "import-fresh";

import { describe } from "../../test-framework";
import { ServiceProvider } from ".";

const importDefaults = () => importFresh<any>("../distribution/defaults.js").defaults;

describe<{
	app: Application;
	serviceProvider: ServiceProvider;
}>("ServiceProvider", ({ beforeEach, it, assert, stub }) => {
	beforeEach((context) => {
		const app = new Application(new Container());
		app.bind(Identifiers.TriggerService).to(Services.Triggers.Triggers).inSingletonScope();
		app.bind(Identifiers.LogService).toConstantValue({});
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
