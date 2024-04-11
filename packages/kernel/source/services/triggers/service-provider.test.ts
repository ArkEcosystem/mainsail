import { Container } from "@mainsail/container";
import { Identifiers } from "@mainsail/contracts";

import { describe } from "../../../../test-framework/source";
import { Application } from "../../application";
import { ServiceProvider, Triggers } from "./index";

describe<{
	app: Application;
}>("TriggersServiceProvider", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.app = new Application(new Container());
	});
	it(".register", async (context) => {
		assert.false(context.app.isBound(Identifiers.Services.Trigger.Service));

		await context.app.resolve<ServiceProvider>(ServiceProvider).register();

		assert.true(context.app.isBound(Identifiers.Services.Trigger.Service));
		assert.instance(context.app.get(Identifiers.Services.Trigger.Service), Triggers);
	});
});
