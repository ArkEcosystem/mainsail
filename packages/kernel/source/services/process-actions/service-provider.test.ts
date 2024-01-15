import { Container } from "@mainsail/container";
import { Identifiers } from "@mainsail/contracts";

import { describe } from "../../../../test-framework";
import { Application } from "../../application";
import { Pm2ProcessActionsService } from "./drivers/pm2";
import { ServiceProvider } from "./service-provider";

describe<{
	app: Application;
}>("ProcessActionsServiceProvider", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.app = new Application(new Container());
	});

	it(".register", async (context) => {
		assert.false(context.app.isBound(Identifiers.Services.ProcessActions.Service));

		await context.app.resolve<ServiceProvider>(ServiceProvider).register();

		assert.true(context.app.isBound(Identifiers.Services.ProcessActions.Service));
		assert.instance(context.app.get(Identifiers.Services.ProcessActions.Service), Pm2ProcessActionsService);
	});
});
