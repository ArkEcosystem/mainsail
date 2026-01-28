import { Identifiers } from "@mainsail/constants";
import { Application, Services } from "@mainsail/kernel";

import esmock from "esmock";

import { describe, Contracts } from "@mainsail/test-runner";
import { ServiceProvider } from "./service-provider";

let bootstrapStub: Contracts.Stub;
class Bootstrapper {
	public async bootstrap() {
		bootstrapStub.call();
	}
}

const { ServiceProvider: ServiceProviderProxy } = await esmock("./service-provider", {
	"./bootstrapper": {
		Bootstrapper,
	},
});

describe<{
	app: Application;
	serviceProvider: ServiceProvider;
}>("ServiceProvider", ({ beforeEach, it, assert, stubFn }) => {
	beforeEach((context) => {
		const app = new Application();
		app.bind(Identifiers.Services.Trigger.Service).to(Services.Triggers.Triggers).inSingletonScope();
		app.bind(Identifiers.Services.Log.Service).toConstantValue({});
		app.bind(Identifiers.Cryptography.Configuration).toConstantValue({});

		context.serviceProvider = app.resolve(ServiceProviderProxy);
		context.app = app;
	});

	it("should be required", async (context) => {
		assert.true(await context.serviceProvider.required());
	});

	it("should register", async (context) => {
		await assert.resolves(() => context.serviceProvider.register());
	});

	it("should bootstrap on boot", async (context) => {
		bootstrapStub = stubFn();

		await context.serviceProvider.register();
		await context.serviceProvider.boot();

		bootstrapStub.calledOnce();
	});
});
