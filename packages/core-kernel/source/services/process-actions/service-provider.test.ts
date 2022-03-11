import { describe } from "../../../../core-test-framework";

import { Application } from "../../application";
import { Container, Identifiers } from "../../ioc";
import { ServiceProvider } from "./service-provider";
import { Pm2ProcessActionsService } from "./drivers/pm2";

describe<{
	app: Application;
}>("ProcessActionsServiceProvider", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.app = new Application(new Container());
	});

	it(".register", async (context) => {
		assert.false(context.app.isBound(Identifiers.ProcessActionsService));

		await context.app.resolve<ServiceProvider>(ServiceProvider).register();

		assert.true(context.app.isBound(Identifiers.ProcessActionsService));
		assert.instance(context.app.get(Identifiers.ProcessActionsService), Pm2ProcessActionsService);
	});
});
