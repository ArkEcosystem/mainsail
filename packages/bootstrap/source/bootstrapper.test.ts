import { Identifiers } from "@mainsail/constants";
import { Application, Services } from "@mainsail/kernel";


import { describe } from "@mainsail/test-runner";
import { Bootstrapper } from "./bootstrapper";

describe<{
	app: Application;
	bootstrapper: Bootstrapper;
}>("Bootstrapper", ({ beforeEach, it, assert, stubFn }) => {
	beforeEach((context) => {
		const app = new Application();
		app.bind(Identifiers.Services.Trigger.Service).to(Services.Triggers.Triggers).inSingletonScope();
		app.bind(Identifiers.Services.Log.Service).toConstantValue({});
		app.bind(Identifiers.Cryptography.Configuration).toConstantValue({});

		context.serviceProvider = app.resolve(ServiceProviderProxy);
		context.app = app;
	});

});
